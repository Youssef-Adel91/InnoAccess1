import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Commission, { CommissionStatus } from '@/models/Commission';
import Wallet from '@/models/Wallet';
import Payout, { PayoutMethod, PayoutStatus } from '@/models/Payout';
import mongoose, { Types } from 'mongoose';

// ─── Validation ────────────────────────────────────────────────────────────────

const VALID_METHODS: PayoutMethod[] = [PayoutMethod.VODAFONE_CASH, PayoutMethod.INSTAPAY];
const MIN_PAYOUT_AMOUNT = 50; // EGP — minimum withdrawal amount

// ─── POST /api/volunteer/payout ────────────────────────────────────────────────

/**
 * POST /api/volunteer/payout
 *
 * Submits a withdrawal request for the volunteer's available balance.
 *
 * ── Safety Guarantees ─────────────────────────────────────────────────────────
 * 1. Lazy unlock runs first so the available balance is always current.
 * 2. Amount validated against real-time availableBalance from DB (not client).
 * 3. Only ONE pending payout allowed at a time per volunteer.
 * 4. All three writes (Commission status, Payout create, Wallet debit) are
 *    wrapped in a Mongoose transaction so partial failures are impossible.
 *
 * Body: { amount: number; method: 'vodafone_cash'|'instapay'; accountNumber: string }
 *
 * Auth: Volunteer role only.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json(
                { success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
                { status: 401 }
            );
        }

        if (session.user.role !== 'volunteer') {
            return NextResponse.json(
                { success: false, error: { message: 'Volunteers only', code: 'FORBIDDEN' } },
                { status: 403 }
            );
        }

        const body = await req.json() as { amount?: unknown; method?: unknown; accountNumber?: unknown };
        const { amount, method, accountNumber } = body;

        // ── Input validation ──────────────────────────────────────────────────
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

        const volunteerId = new Types.ObjectId(session.user.id);
        const now = new Date();

        // ── Step 1: Lazy unlock (same as commissions route) ───────────────────
        const toUnlock = await Commission.find({
            volunteerId,
            status:    CommissionStatus.PENDING,
            unlocksAt: { $lte: now },
        }).select('_id commissionAmount').lean();

        if (toUnlock.length > 0) {
            const totalUnlocked = toUnlock.reduce((s, c) => s + c.commissionAmount, 0);
            await Commission.updateMany(
                { _id: { $in: toUnlock.map((c) => c._id) } },
                { $set: { status: CommissionStatus.AVAILABLE } }
            );
            await Wallet.findOneAndUpdate(
                { volunteerId },
                { $inc: { pendingBalance: -totalUnlocked, availableBalance: +totalUnlocked } },
                { upsert: true }
            );
        }

        // ── Step 2: Fetch current wallet (after unlock) ───────────────────────
        const wallet = await Wallet.findOne({ volunteerId });

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
        const activePayout = await Payout.exists({
            volunteerId,
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

        // ── Step 4: Select available commissions up to the requested amount ───
        // Collect available commissions, oldest first (FIFO), until we reach amount.
        const availableCommissions = await Commission.find({
            volunteerId,
            status: CommissionStatus.AVAILABLE,
        }).sort({ createdAt: 1 }).select('_id commissionAmount').lean();

        const selectedCommissions: Types.ObjectId[] = [];
        let accumulated = 0;

        for (const commission of availableCommissions) {
            if (accumulated >= amount) break;
            selectedCommissions.push(commission._id as Types.ObjectId);
            accumulated += commission.commissionAmount;
        }

        // ── Step 5: Mongoose transaction — all-or-nothing ─────────────────────
        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();

        try {
            // a) Create the Payout document
            const [payout] = await Payout.create(
                [
                    {
                        volunteerId,
                        amount:        amount,
                        method:        method as PayoutMethod,
                        accountNumber: trimmedAccount,
                        status:        PayoutStatus.PENDING,
                        commissionIds: selectedCommissions,
                    },
                ],
                { session: dbSession }
            );

            // b) Mark selected commissions as 'paid' and link to this payout
            await Commission.updateMany(
                { _id: { $in: selectedCommissions } },
                {
                    $set: {
                        status:   CommissionStatus.PAID,
                        payoutId: payout._id,
                    },
                },
                { session: dbSession }
            );

            // c) Debit the wallet
            await Wallet.findOneAndUpdate(
                { volunteerId },
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
                `✅ Payout request ${payout._id}: EGP ${amount} via ${method} ` +
                `for volunteer ${volunteerId}, ${selectedCommissions.length} commissions locked`
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
            throw txError; // Re-throw so the outer catch handles it
        } finally {
            await dbSession.endSession();
        }

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('❌ Payout request error:', error);
        return NextResponse.json(
            { success: false, error: { message, code: 'PAYOUT_ERROR' } },
            { status: 500 }
        );
    }
}
