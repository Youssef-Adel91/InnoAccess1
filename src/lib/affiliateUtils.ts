/**
 * Affiliate Marketing Utilities
 *
 * Contains exports used throughout the affiliate system:
 *
 *  1. generateAffiliateCode()           — creates a unique VOL_XXXXXX code
 *  2. getCommissionTier()               — derives the correct tier/rate from total sales
 *  3. attributeAffiliateCommission()    — the single, canonical function that
 *                                         creates a Commission and updates the
 *                                         Wallet. Called from BOTH payment paths:
 *                                         - Manual order approval (admin)
 *                                         - Paymob webhook
 *
 * ── Tiered Commission System ───────────────────────────────────────────────────
 * Commission rate is based on the volunteer's total historical sales count:
 *
 *   Tier 1 (Starter):  0 – 49 sales  → 10%
 *   Tier 2 (Pro):     50 – 99 sales  → 15%
 *   Tier 3 (Elite):  100+    sales  → 20% (maximum cap)
 *
 * ── Math Bug Fix ──────────────────────────────────────────────────────────────
 * Order.amount is stored in CENTS (e.g. 20000 for a 200 EGP course).
 * All commission calculations divide by 100 first to get the EGP value.
 */

import { Types } from 'mongoose';

// ─── Tiered Commission Configuration ──────────────────────────────────────────

export interface CommissionTier {
    /** Human-readable tier number (1, 2, or 3) */
    tier:     1 | 2 | 3;
    /** Minimum total sales to qualify for this tier */
    minSales: number;
    /** Decimal commission rate (e.g. 0.10 = 10%) */
    rate:     number;
    /** Human-readable rate label (e.g. "10%") */
    label:    string;
    /** Human-readable tier name */
    name:     string;
}

/**
 * Commission tiers, ordered highest-to-lowest so `.find()` returns
 * the correct (highest qualifying) tier.
 */
export const COMMISSION_TIERS: readonly CommissionTier[] = [
    { tier: 3, minSales: 100, rate: 0.20, label: '20%', name: 'Elite'   },
    { tier: 2, minSales: 50,  rate: 0.15, label: '15%', name: 'Pro'     },
    { tier: 1, minSales: 0,   rate: 0.10, label: '10%', name: 'Starter' },
] as const;

/** Default / baseline tier (Tier 1 — Starter) */
export const DEFAULT_COMMISSION_TIER = COMMISSION_TIERS[2]; // tier 1 at index 2

/**
 * Returns the commission tier that applies for the given total-sales count.
 *
 * @param totalSales  Number of completed commissions for the volunteer
 */
export function getCommissionTier(totalSales: number): CommissionTier {
    return COMMISSION_TIERS.find((t) => totalSales >= t.minSales) ?? DEFAULT_COMMISSION_TIER;
}

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
    const chars  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
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
 * ── IMPORTANT: saleAmount is in CENTS ─────────────────────────────────────────
 * Order.amount is stored in cents (e.g. 20000 for a 200 EGP course).
 * This function converts to EGP internally before computing commissions.
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
 *   - Commission rate is dynamically derived from volunteer's total sales count
 *
 * This function NEVER throws — it logs errors and returns void so a commission
 * bug cannot fail a payment or an admin approval action.
 *
 * @param orderId      MongoDB ObjectId of the Order
 * @param buyerId      MongoDB ObjectId of the buyer (User)
 * @param courseId     MongoDB ObjectId of the Course
 * @param saleAmount   The paid amount in CENTS (e.g. 20000 for 200 EGP)
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
            role:          'volunteer',
            isActive:      true,
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

        // ── Determine commission tier from total sales count ──────────────────
        // Count all existing commissions for this volunteer (all statuses)
        // to determine their tier BEFORE this new sale.
        const existingSalesCount = await Commission.countDocuments({
            volunteerId: volunteer._id,
        });

        const tier           = getCommissionTier(existingSalesCount);
        const commissionRate = tier.rate;

        // ── BUG FIX: Convert cents → EGP before computing commission ─────────
        // Order.amount is stored in cents (e.g. 20000 for 200 EGP).
        // Divide by 100 to get the EGP value, then apply the rate.
        const saleAmountEGP    = saleAmount / 100;
        const commissionAmount = Math.round(saleAmountEGP * commissionRate);
        const unlocksAt        = new Date(Date.now() + COMMISSION_LOCK_DAYS * 24 * 60 * 60 * 1000);

        // ── Create Commission document ────────────────────────────────────────
        await Commission.create({
            volunteerId:      volunteer._id,
            buyerId,
            courseId,
            orderId,
            affiliateCode:    refCode,
            saleAmount:       saleAmountEGP,   // store in EGP for display/audit
            commissionRate,
            commissionAmount,
            status:           'pending',
            unlocksAt,
        });

        // ── Upsert Wallet (atomic $inc — no race conditions) ──────────────────
        // findOneAndUpdate with upsert:true creates the Wallet if it doesn't exist.
        // $inc is atomic at the MongoDB level — safe for concurrent requests.
        await Wallet.findOneAndUpdate(
            { userId: volunteer._id, userType: 'volunteer' },
            {
                $inc: {
                    pendingBalance: commissionAmount,
                    totalEarned:    commissionAmount,
                },
                $setOnInsert: {
                    // Only set these on document creation (first commission ever)
                    userId:           volunteer._id,
                    userType:         'volunteer',
                    availableBalance: 0,
                    totalPaidOut:     0,
                },
            },
            { upsert: true, new: true }
        );

        console.log(
            `✅ Affiliate commission attributed: ` +
            `${refCode} [Tier ${tier.tier} — ${tier.label}] → ` +
            `EGP ${commissionAmount} on EGP ${saleAmountEGP} sale (order ${orderId}), ` +
            `unlocks ${unlocksAt.toISOString()}`
        );

    } catch (error) {
        // Log but never re-throw — commission errors must not fail payments
        console.error('❌ Affiliate commission attribution error:', error);
    }
}
