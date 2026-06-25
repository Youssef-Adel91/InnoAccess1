import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import LedgerEntry, { LedgerEntryType } from '@/models/LedgerEntry';
import Wallet from '@/models/Wallet';
import TrainerPayout from '@/models/TrainerPayout';
import { PayoutMethod, PayoutStatus } from '@/models/Payout';
import mongoose, { Types } from 'mongoose';

const MIN_PAYOUT_AMOUNT = process.env.MIN_PAYOUT_AMOUNT ? parseInt(process.env.MIN_PAYOUT_AMOUNT) : 100;
const VALID_METHODS: PayoutMethod[] = [PayoutMethod.VODAFONE_CASH, PayoutMethod.INSTAPAY];

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json(
                { success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
                { status: 401 }
            );
        }

        if (session.user.role !== 'trainer') {
            return NextResponse.json(
                { success: false, error: { message: 'Trainers only', code: 'FORBIDDEN' } },
                { status: 403 }
            );
        }

        const body = await req.json() as { amount?: unknown; method?: unknown; accountNumber?: unknown };
        const { amount, method, accountNumber } = body;

        if (typeof amount !== 'number' || amount < MIN_PAYOUT_AMOUNT) {
            return NextResponse.json(
                { success: false, error: { message: `Minimum withdrawal is EGP ${MIN_PAYOUT_AMOUNT}`, code: 'INVALID_AMOUNT' } },
                { status: 400 }
            );
        }

        if (!method || !VALID_METHODS.includes(method as PayoutMethod)) {
            return NextResponse.json(
                { success: false, error: { message: 'Method must be vodafone_cash or instapay', code: 'INVALID_METHOD' } },
                { status: 400 }
            );
        }

        const trimmedAccount = typeof accountNumber === 'string' ? accountNumber.trim() : '';
        if (!trimmedAccount || trimmedAccount.length < 6 || trimmedAccount.length > 30) {
            return NextResponse.json(
                { success: false, error: { message: 'Invalid account number (6–30 characters)', code: 'INVALID_ACCOUNT' } },
                { status: 400 }
            );
        }

        await connectDB();

        const trainerId = new Types.ObjectId(session.user.id);
        const now = new Date();

        // ── Step 1: Lazy unlock ───────────────────
        const toUnlock = await LedgerEntry.find({
            userId: trainerId,
            entryType: LedgerEntryType.TRAINER_COMMISSION,
            status: 'PENDING',
            unlocksAt: { $lte: now },
        }).select('_id amount').lean();

        if (toUnlock.length > 0) {
            const totalUnlocked = toUnlock.reduce((s, c) => s + c.amount, 0);
            await LedgerEntry.updateMany(
                { _id: { $in: toUnlock.map((c) => c._id) } },
                { $set: { status: 'AVAILABLE' } }
            );
            await Wallet.findOneAndUpdate(
                { userId: trainerId, userType: 'trainer' },
                { $inc: { pendingBalance: -totalUnlocked, availableBalance: +totalUnlocked } },
                { upsert: true }
            );
        }

        // ── Step 2: Fetch current wallet ───────────────────────
        const wallet = await Wallet.findOne({ userId: trainerId, userType: 'trainer' });

        if (!wallet || wallet.availableBalance < amount) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: `Insufficient available balance. You have EGP ${wallet?.availableBalance ?? 0} available.`,
                        code: 'INSUFFICIENT_BALANCE',
                    },
                },
                { status: 400 }
            );
        }

        // ── Step 3: One active payout at a time ───────────────────────────────
        const activePayout = await TrainerPayout.exists({
            trainerId,
            status: { $in: [PayoutStatus.PENDING, PayoutStatus.APPROVED] },
        });

        if (activePayout) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'You already have a pending or approved payout request. Wait for it to be processed before submitting a new one.',
                        code: 'ACTIVE_PAYOUT_EXISTS',
                    },
                },
                { status: 409 }
            );
        }

        // ── Step 4: Select available ledger entries up to the requested amount ───
        const availableEntries = await LedgerEntry.find({
            userId: trainerId,
            entryType: LedgerEntryType.TRAINER_COMMISSION,
            status: 'AVAILABLE',
        }).sort({ createdAt: 1 }).select('_id amount').lean();

        const selectedEntries: Types.ObjectId[] = [];
        let accumulated = 0;

        for (const entry of availableEntries) {
            if (accumulated >= amount) break;
            selectedEntries.push(entry._id as Types.ObjectId);
            accumulated += entry.amount;
        }

        // ── Step 5: Mongoose transaction ─────────────────────
        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();

        try {
            const [payout] = await TrainerPayout.create(
                [
                    {
                        trainerId,
                        amount:        amount,
                        method:        method as PayoutMethod,
                        accountNumber: trimmedAccount,
                        status:        PayoutStatus.PENDING,
                        ledgerEntryIds: selectedEntries,
                    },
                ],
                { session: dbSession }
            );

            await LedgerEntry.updateMany(
                { _id: { $in: selectedEntries } },
                {
                    $set: {
                        status: 'PAID',
                    },
                },
                { session: dbSession }
            );

            await Wallet.findOneAndUpdate(
                { userId: trainerId, userType: 'trainer' },
                {
                    $inc: {
                        availableBalance: -amount,
                        totalPaidOut:     +amount,
                    },
                },
                { session: dbSession }
            );

            await dbSession.commitTransaction();

            console.log(
                `✅ Trainer Payout request ${payout._id}: EGP ${amount} via ${method} ` +
                `for trainer ${trainerId}, ${selectedEntries.length} entries locked`
            );

            return NextResponse.json(
                {
                    success: true,
                    data: {
                        message: 'Withdrawal request submitted. The admin will process it shortly.',
                        payoutId: payout._id.toString(),
                    },
                },
                { status: 201 }
            );

        } catch (txError) {
            await dbSession.abortTransaction();
            throw txError;
        } finally {
            await dbSession.endSession();
        }

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('❌ Trainer Payout request error:', error);
        return NextResponse.json(
            { success: false, error: { message, code: 'PAYOUT_ERROR' } },
            { status: 500 }
        );
    }
}
