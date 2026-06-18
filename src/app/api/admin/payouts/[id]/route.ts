import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Payout, { PayoutStatus } from '@/models/Payout';
import Commission, { CommissionStatus } from '@/models/Commission';
import Wallet from '@/models/Wallet';
import mongoose, { Types } from 'mongoose';

// ─── State Machine ─────────────────────────────────────────────────────────────
//
// Valid transitions:
//   pending  → approved   (admin confirms they will process it)
//   approved → paid       (admin has physically sent the money)
//   pending  → rejected   (admin rejects with a note → FULL REFUND)
//   approved → rejected   (admin reverses after approving → FULL REFUND)
//
// The "rejected" transition MUST reverse the wallet deduction and unlink
// commissions because Phase 4's payout route deducted the balance upfront.

const VALID_TRANSITIONS: Partial<Record<PayoutStatus, PayoutStatus[]>> = {
    [PayoutStatus.PENDING]:  [PayoutStatus.APPROVED, PayoutStatus.REJECTED],
    [PayoutStatus.APPROVED]: [PayoutStatus.PAID,     PayoutStatus.REJECTED],
};

// ─── PATCH /api/admin/payouts/[id] ────────────────────────────────────────────

/**
 * PATCH /api/admin/payouts/[id]
 *
 * Transitions a payout to a new status.
 *
 * Body: { action: 'approved' | 'paid' | 'rejected'; adminNote?: string }
 *
 * ── Rejection Logic (Critical Edge Case) ─────────────────────────────────────
 * Phase 4 deducted `availableBalance` and incremented `totalPaidOut` when the
 * volunteer submitted the request. To reject cleanly we MUST reverse those
 * wallet changes AND restore the associated Commission documents to 'available'.
 *
 * All three writes (Payout update, Commission reset, Wallet refund) are wrapped
 * in a Mongoose transaction so a partial failure is impossible.
 *
 * Auth: Admin only.
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: { message: 'Admin access required', code: 'FORBIDDEN' } },
                { status: 403 }
            );
        }

        const { id } = await params;

        if (!mongoose.isValidObjectId(id)) {
            return NextResponse.json(
                { success: false, error: { message: 'Invalid payout ID', code: 'INVALID_ID' } },
                { status: 400 }
            );
        }

        const body = await req.json() as { action?: unknown; adminNote?: unknown };
        const { action, adminNote } = body;

        if (!action || typeof action !== 'string') {
            return NextResponse.json(
                { success: false, error: { message: 'action is required', code: 'MISSING_ACTION' } },
                { status: 400 }
            );
        }

        const newStatus = action as PayoutStatus;

        if (!Object.values(PayoutStatus).includes(newStatus)) {
            return NextResponse.json(
                { success: false, error: { message: `Invalid action "${action}"`, code: 'INVALID_ACTION' } },
                { status: 400 }
            );
        }

        if (newStatus === PayoutStatus.REJECTED && (!adminNote || typeof adminNote !== 'string' || !adminNote.trim())) {
            return NextResponse.json(
                { success: false, error: { message: 'A rejection note is required', code: 'NOTE_REQUIRED' } },
                { status: 400 }
            );
        }

        await connectDB();

        const payout = await Payout.findById(id);

        if (!payout) {
            return NextResponse.json(
                { success: false, error: { message: 'Payout not found', code: 'NOT_FOUND' } },
                { status: 404 }
            );
        }

        // ── Validate state machine transition ─────────────────────────────────
        const allowedNext = VALID_TRANSITIONS[payout.status];
        if (!allowedNext || !allowedNext.includes(newStatus)) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: `Cannot transition from "${payout.status}" to "${newStatus}"`,
                        code: 'INVALID_TRANSITION',
                    },
                },
                { status: 422 }
            );
        }

        const adminId = new Types.ObjectId(session.user.id);
        const now     = new Date();

        // ── APPROVED or PAID: simple status update ────────────────────────────
        if (newStatus === PayoutStatus.APPROVED || newStatus === PayoutStatus.PAID) {
            payout.status      = newStatus;
            payout.processedBy = adminId;
            payout.processedAt = now;
            if (adminNote && typeof adminNote === 'string') {
                payout.adminNote = adminNote.trim();
            }
            await payout.save();

            console.log(`✅ Payout ${id}: ${payout.status} → ${newStatus} by admin ${session.user.id}`);

            return NextResponse.json({
                success: true,
                data: {
                    message: `Payout marked as ${newStatus}.`,
                    payoutId: id,
                    newStatus,
                },
            });
        }

        // ── REJECTED: full refund transaction ─────────────────────────────────
        //
        // All three writes must succeed or none of them persist.
        //   1. Mark Payout as rejected (with admin note)
        //   2. Reset associated Commissions: paid → available, clear payoutId
        //   3. Reverse Wallet: availableBalance += amount, totalPaidOut -= amount

        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();

        try {
            // 1. Update the Payout document
            await Payout.findByIdAndUpdate(
                id,
                {
                    $set: {
                        status:      PayoutStatus.REJECTED,
                        adminNote:   (adminNote as string).trim(),
                        processedBy: adminId,
                        processedAt: now,
                    },
                },
                { session: dbSession }
            );

            // 2. Restore associated commissions → back to 'available'
            //    Clear the payoutId so they become eligible for a future payout request.
            await Commission.updateMany(
                {
                    _id:    { $in: payout.commissionIds },
                    status: CommissionStatus.PAID,          // safety check
                },
                {
                    $set:   { status: CommissionStatus.AVAILABLE },
                    $unset: { payoutId: '' },
                },
                { session: dbSession }
            );

            // 3. Reverse the wallet deduction
            //    availableBalance += payout.amount  (gives the money back)
            //    totalPaidOut     -= payout.amount  (corrects the lifetime stat)
            await Wallet.findOneAndUpdate(
                { volunteerId: payout.volunteerId },
                {
                    $inc: {
                        availableBalance: +payout.amount,
                        totalPaidOut:     -payout.amount,
                    },
                },
                { session: dbSession }
            );

            await dbSession.commitTransaction();

            console.log(
                `🔄 Payout ${id} REJECTED by admin ${session.user.id}. ` +
                `Refunded EGP ${payout.amount} to volunteer ${payout.volunteerId}. ` +
                `${payout.commissionIds.length} commission(s) restored to 'available'.`
            );

            return NextResponse.json({
                success: true,
                data: {
                    message:   'Payout rejected. The volunteer\'s balance has been fully restored.',
                    payoutId:  id,
                    newStatus: PayoutStatus.REJECTED,
                    refunded:  payout.amount,
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
        console.error('❌ Admin payout action error:', error);
        return NextResponse.json(
            { success: false, error: { message, code: 'PAYOUT_ACTION_ERROR' } },
            { status: 500 }
        );
    }
}
