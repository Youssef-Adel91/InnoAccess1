/**
 * Affiliate Marketing Utilities
 *
 * Contains two exports used throughout the affiliate system:
 *
 *  1. generateAffiliateCode()           — creates a unique VOL_XXXXXX code
 *  2. attributeAffiliateCommission()    — the single, canonical function that
 *                                         creates a Commission and updates the
 *                                         Wallet. Called from BOTH payment paths:
 *                                         - Manual order approval (admin)
 *                                         - Paymob webhook (future)
 */

import { Types } from 'mongoose';

// ─── Constants ─────────────────────────────────────────────────────────────────

/** Commission rate: 10% of the sale amount */
export const COMMISSION_RATE = 0.10;

/** How many days a commission stays locked after a sale (anti-refund hold) */
export const COMMISSION_LOCK_DAYS = 14;

// ─── Code Generation ───────────────────────────────────────────────────────────

/**
 * Generates a new affiliate code in the format `VOL_XXXXXX`
 * where XXXXXX is 6 uppercase alphanumeric characters.
 *
 * Collision probability with 36^6 = ~2.2 billion possible values is negligible,
 * but the caller should still retry on MongoDB unique-index violations.
 */
export function generateAffiliateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const suffix = Array.from({ length: 6 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
    ).join('');
    return `VOL_${suffix}`;
}

// ─── Commission Attribution ────────────────────────────────────────────────────

/**
 * attributeAffiliateCommission
 *
 * The single source of truth for creating a commission after a confirmed sale.
 * Called by BOTH payment paths so the logic is never duplicated:
 *   - Manual order approval:  /api/admin/orders/[id]/approve
 *   - Paymob webhook:         /api/webhooks/paymob
 *
 * Guards in order:
 *   1. Missing / malformed ref code       → skip silently
 *   2. Zero-amount sale (free course)     → skip silently
 *   3. Volunteer not found / wrong role   → skip silently
 *   4. Self-referral (anti-fraud)         → skip + warn
 *   5. Duplicate commission (idempotency) → skip silently
 *
 * On success:
 *   - Creates one Commission document (status: 'pending', locked 14 days)
 *   - Upserts Wallet (auto-creates on first commission) using $inc to avoid
 *     read-modify-write races
 *
 * This function NEVER throws — it logs errors and returns void so a commission
 * bug cannot fail a payment or an admin approval action.
 *
 * @param orderId      MongoDB ObjectId of the Order
 * @param buyerId      MongoDB ObjectId of the buyer (User)
 * @param courseId     MongoDB ObjectId of the Course
 * @param saleAmount   The paid amount in EGP (whole units, not cents)
 * @param refCode      The affiliate code from Order.affiliateRef (may be nullish)
 */
export async function attributeAffiliateCommission(
    orderId:    Types.ObjectId,
    buyerId:    Types.ObjectId,
    courseId:   Types.ObjectId,
    saleAmount: number,
    refCode:    string | null | undefined
): Promise<void> {
    try {
        // ── Guard 1: No ref code ──────────────────────────────────────────────
        if (!refCode || !/^VOL_[A-Z0-9]{6}$/.test(refCode)) {
            return;
        }

        // ── Guard 2: Free course — no commission ──────────────────────────────
        if (saleAmount <= 0) {
            console.log(`ℹ️ Affiliate: no commission for free course (order ${orderId})`);
            return;
        }

        // Lazy imports so this utility can be imported in Edge or Node contexts
        // without pulling models into Edge bundles unintentionally.
        const User       = (await import('@/models/User')).default;
        const Commission = (await import('@/models/Commission')).default;
        const Wallet     = (await import('@/models/Wallet')).default;

        // ── Guard 3: Volunteer must exist and have the correct role ───────────
        const volunteer = await User.findOne({
            affiliateCode: refCode,
            role: 'volunteer',
            isActive: true,
        }).select('_id role').lean();

        if (!volunteer) {
            console.warn(`⚠️ Affiliate: code "${refCode}" not found or not a volunteer`);
            return;
        }

        // ── Guard 4: Anti-fraud — self-referral check ─────────────────────────
        if (volunteer._id.toString() === buyerId.toString()) {
            console.warn(`🚨 Affiliate: self-referral blocked — volunteer ${volunteer._id} tried to earn from own purchase`);
            return;
        }

        // ── Guard 5: Idempotency — one commission per order ───────────────────
        const alreadyExists = await Commission.exists({ orderId });
        if (alreadyExists) {
            console.log(`ℹ️ Affiliate: commission for order ${orderId} already exists, skipping`);
            return;
        }

        // ── Calculate commission ──────────────────────────────────────────────
        // Use Math.round to avoid floating-point issues (e.g. 500 * 0.10 = 50.00000...1)
        const commissionAmount = Math.round(saleAmount * COMMISSION_RATE);
        const unlocksAt = new Date(Date.now() + COMMISSION_LOCK_DAYS * 24 * 60 * 60 * 1000);

        // ── Create Commission document ────────────────────────────────────────
        await Commission.create({
            volunteerId:      volunteer._id,
            buyerId,
            courseId,
            orderId,
            affiliateCode:    refCode,
            saleAmount,
            commissionRate:   COMMISSION_RATE,
            commissionAmount,
            status:           'pending',
            unlocksAt,
        });

        // ── Upsert Wallet (atomic $inc — no race conditions) ──────────────────
        // findOneAndUpdate with upsert:true creates the Wallet if it doesn't exist.
        // $inc is atomic at the MongoDB level — safe for concurrent requests.
        await Wallet.findOneAndUpdate(
            { volunteerId: volunteer._id },
            {
                $inc: {
                    pendingBalance: commissionAmount,
                    totalEarned:    commissionAmount,
                },
                $setOnInsert: {
                    // Only set these on document creation (first commission ever)
                    volunteerId:      volunteer._id,
                    availableBalance: 0,
                    totalPaidOut:     0,
                },
            },
            { upsert: true, new: true }
        );

        console.log(
            `✅ Affiliate commission attributed: ` +
            `${refCode} → EGP ${commissionAmount} (order ${orderId}), ` +
            `unlocks ${unlocksAt.toISOString()}`
        );

    } catch (error) {
        // Log but never re-throw — commission errors must not fail payments
        console.error('❌ Affiliate commission attribution error:', error);
    }
}
