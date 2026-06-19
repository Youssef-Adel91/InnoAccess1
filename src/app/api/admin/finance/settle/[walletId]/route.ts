import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Wallet from '@/models/Wallet';
import LedgerEntry, { LedgerEntryType } from '@/models/LedgerEntry';
import mongoose, { Types } from 'mongoose';

/**
 * POST /api/admin/finance/settle/[walletId]
 *
 * "Mark as Paid" action — settles the full available balance of a wallet.
 *
 * ── What it does (in a transaction) ──────────────────────────────────────────
 *   1. Read the wallet's current availableBalance (server-side, not from client)
 *   2. Create a PAYOUT_SETTLED LedgerEntry (amount = availableBalance)
 *   3. Reset availableBalance → 0, increment totalPaidOut
 *
 * ── Safety guarantees ─────────────────────────────────────────────────────────
 *   - Amount is always read from DB — client cannot inject a different value
 *   - Zero-balance wallets are rejected early (no-op guard)
 *   - All 3 writes are in a Mongoose transaction (atomic or fully rolled back)
 *   - Idempotent: calling twice on a zeroed wallet returns 400, not double-credit
 *
 * Auth: Admin only.
 */
export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ walletId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: { message: 'Admin access required', code: 'FORBIDDEN' } },
                { status: 403 }
            );
        }

        const { walletId } = await params;

        if (!mongoose.isValidObjectId(walletId)) {
            return NextResponse.json(
                { success: false, error: { message: 'Invalid wallet ID', code: 'INVALID_ID' } },
                { status: 400 }
            );
        }

        await connectDB();

        // ── Step 1: Read current wallet balance ───────────────────────────────
        const wallet = await Wallet.findById(walletId).lean();

        if (!wallet) {
            return NextResponse.json(
                { success: false, error: { message: 'Wallet not found', code: 'NOT_FOUND' } },
                { status: 404 }
            );
        }

        if (wallet.availableBalance <= 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'This wallet has no available balance to settle.',
                        code: 'ZERO_BALANCE',
                    },
                },
                { status: 400 }
            );
        }

        const settledAmount = wallet.availableBalance;
        const adminId       = new Types.ObjectId(session.user.id);

        // ── Step 2: Transaction — all-or-nothing ──────────────────────────────
        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();

        try {
            // a) Create PAYOUT_SETTLED ledger entry
            await LedgerEntry.create(
                [{
                    entryType: LedgerEntryType.PAYOUT_SETTLED,
                    amount:    settledAmount,
                    userId:    wallet.userId,
                    note:      `Manual settlement by admin — ${wallet.userType} wallet ${walletId} (EGP ${settledAmount})`,
                }],
                { session: dbSession }
            );

            // b) Reset wallet: availableBalance → 0, totalPaidOut += amount
            await Wallet.findByIdAndUpdate(
                walletId,
                {
                    $set: { availableBalance: 0 },
                    $inc: { totalPaidOut: settledAmount },
                },
                { session: dbSession }
            );

            await dbSession.commitTransaction();

            console.log(
                `✅ Wallet settled: ${walletId} — EGP ${settledAmount} paid to ${wallet.userType} ` +
                `(userId: ${wallet.userId}) by admin ${adminId}`
            );

            return NextResponse.json({
                success: true,
                data: {
                    message:       `EGP ${settledAmount} marked as paid successfully.`,
                    settledAmount,
                    walletId,
                },
            });

        } catch (txError) {
            await dbSession.abortTransaction();
            throw txError;
        } finally {
            await dbSession.endSession();
        }

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('❌ Finance settle error:', error);
        return NextResponse.json(
            { success: false, error: { message, code: 'SETTLE_ERROR' } },
            { status: 500 }
        );
    }
}
