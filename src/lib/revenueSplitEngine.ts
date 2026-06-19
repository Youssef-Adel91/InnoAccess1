/**
 * revenueSplitEngine — the platform's single revenue split authority
 *
 * Called exclusively from the Manual Order Approval action
 * (`approveManualPayment` in /app/actions/payment.ts) after the admin
 * verifies a student's E-Wallet receipt (Vodafone Cash / Instapay).
 *
 * ── What it does ──────────────────────────────────────────────────────────────
 * For every confirmed paid order, it:
 *   1.  Computes the 5-way revenue split (see formula below)
 *   2.  Creates 4–5 immutable LedgerEntry documents in one bulk insert
 *   3.  Credits the trainer's Wallet (upsert, atomic $inc)
 *   4.  Credits the volunteer's Wallet via attributeAffiliateCommission()
 *       (only if Order.affiliateRef is present; anti-fraud + idempotency guards
 *       are inside that function)
 *   5.  Returns the full split breakdown for the caller to log
 *
 * ── Revenue split formula (all amounts in EGP) ───────────────────────────────
 *
 *   Gross Amount     = Order.amount / 100          (cents → EGP)
 *
 *   Gateway Fee      = Gross × GATEWAY_FEE_RATE    (0% default; set env var
 *                                                   GATEWAY_FEE_RATE to override)
 *
 *   Net After Fee    = Gross − Gateway Fee
 *
 *   Trainer Cut      = Net After Fee × course.trainerCommissionRate   (default 0.40)
 *
 *   Volunteer Cut    = Net After Fee × volunteer tier rate            (0/0.10/0.15/0.20)
 *                      (0 if no affiliate ref on this order)
 *
 *   Platform Profit  = Net After Fee − Trainer Cut − Volunteer Cut
 *
 * ── Idempotency ───────────────────────────────────────────────────────────────
 * The caller (approveManualPayment) already guards against double-approval via
 * the order.status check. The volunteer commission has its own idempotency guard
 * inside attributeAffiliateCommission(). The LedgerEntry bulk insert will fail
 * gracefully if called twice (orderId index will catch it in Phase 2 when we
 * add a unique constraint to the GROSS_REVENUE entry per orderId).
 *
 * ── Error handling ────────────────────────────────────────────────────────────
 * This function NEVER throws. On error it logs and returns { success: false }.
 * A split calculation failure must NOT block the enrollment (student already
 * paid — that must not be reversed). The admin finance reconciliation tools
 * in the dashboard will catch any missing ledger entries.
 */

import { Types } from 'mongoose';
import LedgerEntry, { LedgerEntryType } from '@/models/LedgerEntry';
import Wallet from '@/models/Wallet';
import { attributeAffiliateCommission } from '@/lib/affiliateUtils';

// ─── Configurable fee rate ────────────────────────────────────────────────────
// Default: 0 (no gateway fee — all transactions are manual E-Wallet transfers).
// To integrate a payment gateway later, set GATEWAY_FEE_RATE=0.03 in .env
// for a 3% Paymob fee, or any other decimal fraction.
export const GATEWAY_FEE_RATE: number =
    parseFloat(process.env.GATEWAY_FEE_RATE ?? '0') || 0;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SplitResult {
    /** Order amount converted to EGP (amount / 100) */
    grossAmountEGP:          number;
    /** Cost charged by payment gateway (0 for manual E-Wallet orders) */
    gatewayFeeEGP:           number;
    /** Amount after deducting gateway fee */
    netAfterFeeEGP:          number;
    /** Trainer's share: netAfterFee × trainerCommissionRate */
    trainerCommissionEGP:    number;
    /** Volunteer's affiliate share (0 if no ref code on order) */
    volunteerCommissionEGP:  number;
    /** Remainder kept by the platform */
    platformNetProfitEGP:    number;
    /** Trainer's commission rate snapshot (e.g. 0.40) */
    trainerCommissionRate:   number;
}

interface ExecuteSplitInput {
    /** MongoDB ObjectId of the completed Order */
    orderId: Types.ObjectId;
    /** MongoDB ObjectId of the buyer (student) */
    buyerId: Types.ObjectId;
    /** MongoDB ObjectId of the trainer who owns the course */
    trainerId: Types.ObjectId;
    /** MongoDB ObjectId of the course */
    courseId: Types.ObjectId;
    /** Sale amount in CENTS (e.g. 20000 for a 200 EGP course) — matches Order.amount */
    amountCents: number;
    /** The trainer's commission rate for this specific course (e.g. 0.40) */
    trainerCommissionRate: number;
    /** Affiliate ref code from Order.affiliateRef, or null if no referral */
    affiliateRef: string | null | undefined;
}

interface ExecuteSplitResult {
    success:  boolean;
    split?:   SplitResult;
    error?:   string;
}

// ─── Main function ─────────────────────────────────────────────────────────────

/**
 * executeRevenueSplit
 *
 * Computes and persists the full revenue split for a confirmed order.
 * Must be called AFTER the enrollment is created (so if this fails,
 * the student's access is not revoked).
 *
 * @example
 * // Inside approveManualPayment, after order.save() and Enrollment.create():
 * const split = await executeRevenueSplit({
 *     orderId:               order._id,
 *     buyerId:               order.userId,
 *     trainerId:             course.trainerId,
 *     courseId:              order.courseId,
 *     amountCents:           order.amount,
 *     trainerCommissionRate: course.trainerCommissionRate ?? 0.40,
 *     affiliateRef:          order.affiliateRef ?? null,
 * });
 * if (!split.success) console.warn('Split failed:', split.error);
 */
export async function executeRevenueSplit(
    input: ExecuteSplitInput
): Promise<ExecuteSplitResult> {
    const {
        orderId,
        buyerId,
        trainerId,
        courseId,
        amountCents,
        trainerCommissionRate,
        affiliateRef,
    } = input;

    try {
        // ── Step 1: Compute the 5-way split ──────────────────────────────────

        // Convert cents → EGP. Order.amount is always stored in cents.
        const grossAmountEGP = amountCents / 100;

        if (grossAmountEGP <= 0) {
            // Free course — nothing to split
            console.log(`ℹ️ Split: skipping free course order ${orderId}`);
            return { success: true, split: {
                grossAmountEGP: 0, gatewayFeeEGP: 0, netAfterFeeEGP: 0,
                trainerCommissionEGP: 0, volunteerCommissionEGP: 0,
                platformNetProfitEGP: 0, trainerCommissionRate,
            }};
        }

        const gatewayFeeEGP    = Math.round(grossAmountEGP * GATEWAY_FEE_RATE * 100) / 100;
        const netAfterFeeEGP   = grossAmountEGP - gatewayFeeEGP;

        // Trainer commission — clamped to [0, 1]
        const safeTrainerRate      = Math.min(1, Math.max(0, trainerCommissionRate));
        const trainerCommissionEGP = Math.round(netAfterFeeEGP * safeTrainerRate);

        // Volunteer commission — computed by attributeAffiliateCommission later.
        // We pre-calculate the EGP value here ONLY for the LedgerEntry.
        // The actual wallet credit is done inside attributeAffiliateCommission.
        // We derive the volunteer amount from the same tiered logic used there.
        let volunteerCommissionEGP = 0;

        if (affiliateRef && /^VOL_[A-Z0-9]{6}$/.test(affiliateRef)) {
            // Mirror the tier logic from affiliateUtils.ts to get the EGP amount
            // for the ledger entry. attributeAffiliateCommission will re-compute
            // and write the actual wallet credit atomically.
            const { getCommissionTier } = await import('@/lib/affiliateUtils');
            const Commission = (await import('@/models/Commission')).default;
            const User = (await import('@/models/User')).default;

            const vol = await User.findOne({ affiliateCode: affiliateRef, role: 'volunteer' })
                .select('_id').lean();
            if (vol) {
                const existingCount = await Commission.countDocuments({ volunteerId: vol._id });
                const tier          = getCommissionTier(existingCount);
                volunteerCommissionEGP = Math.round(netAfterFeeEGP * tier.rate);
            }
        }

        const platformNetProfitEGP = Math.round(
            netAfterFeeEGP - trainerCommissionEGP - volunteerCommissionEGP
        );

        const split: SplitResult = {
            grossAmountEGP,
            gatewayFeeEGP,
            netAfterFeeEGP,
            trainerCommissionEGP,
            volunteerCommissionEGP,
            platformNetProfitEGP,
            trainerCommissionRate: safeTrainerRate,
        };

        console.log(
            `💰 Revenue split for order ${orderId}: ` +
            `Gross=${grossAmountEGP} EGP | ` +
            `Fee=${gatewayFeeEGP} | ` +
            `Trainer=${trainerCommissionEGP} | ` +
            `Volunteer=${volunteerCommissionEGP} | ` +
            `Platform=${platformNetProfitEGP}`
        );

        // ── Step 2: Persist LedgerEntry documents ─────────────────────────────
        // Bulk insert — all-or-nothing within MongoDB's document-level atomicity.
        // (Full transaction would require a replica set; bulk insertMany is safe
        //  because LedgerEntry is append-only — no conflicts possible.)

        const ledgerDocs = [
            {
                entryType: LedgerEntryType.GROSS_REVENUE,
                amount:    grossAmountEGP,
                orderId,
                courseId,
                note:      `Gross sale — Order ${orderId}`,
            },
            ...(gatewayFeeEGP > 0 ? [{
                entryType: LedgerEntryType.GATEWAY_FEE,
                amount:    gatewayFeeEGP,
                orderId,
                courseId,
                note:      `Gateway fee (${(GATEWAY_FEE_RATE * 100).toFixed(1)}%) — Order ${orderId}`,
            }] : []),
            {
                entryType: LedgerEntryType.TRAINER_COMMISSION,
                amount:    trainerCommissionEGP,
                orderId,
                courseId,
                userId:    trainerId,
                note:      `Trainer commission (${(safeTrainerRate * 100).toFixed(0)}%) — Order ${orderId}`,
            },
            ...(volunteerCommissionEGP > 0 ? [{
                entryType: LedgerEntryType.VOLUNTEER_COMMISSION,
                amount:    volunteerCommissionEGP,
                orderId,
                courseId,
                note:      `Affiliate commission (ref: ${affiliateRef}) — Order ${orderId}`,
            }] : []),
            {
                entryType: LedgerEntryType.NET_PLATFORM_PROFIT,
                amount:    platformNetProfitEGP,
                orderId,
                courseId,
                note:      `Platform net profit — Order ${orderId}`,
            },
        ];

        await LedgerEntry.insertMany(ledgerDocs);
        console.log(`✅ ${ledgerDocs.length} ledger entries created for order ${orderId}`);

        // ── Step 3: Credit trainer Wallet ────────────────────────────────────
        // Trainers' earnings are immediately available (no hold period —
        // the admin has already manually verified the receipt before approving).
        await Wallet.findOneAndUpdate(
            { userId: trainerId, userType: 'trainer' },
            {
                $inc: {
                    availableBalance: trainerCommissionEGP,
                    totalEarned:      trainerCommissionEGP,
                },
                $setOnInsert: {
                    pendingBalance: 0,
                    totalPaidOut:   0,
                },
            },
            { upsert: true, new: true }
        );
        console.log(`✅ Trainer wallet credited: EGP ${trainerCommissionEGP} for trainer ${trainerId}`);

        // ── Step 4: Credit volunteer Wallet via affiliateUtils ────────────────
        // attributeAffiliateCommission handles its own guards, wallet upsert,
        // and Commission document creation. We pass the CENTS amount because
        // that function handles the conversion internally.
        await attributeAffiliateCommission(
            orderId,
            buyerId,
            courseId,
            amountCents,  // in cents — affiliateUtils divides by 100 internally
            affiliateRef ?? null
        ).catch((err) =>
            console.error('⚠️ Volunteer commission attribution failed (non-fatal):', err)
        );

        return { success: true, split };

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Revenue split failed for order ${orderId}:`, error);
        // Return failure — caller logs but does NOT reverse enrollment
        return { success: false, error: message };
    }
}
