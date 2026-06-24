import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Commission, { CommissionStatus } from '@/models/Commission';
import Wallet from '@/models/Wallet';
import { Types } from 'mongoose';
import { getCommissionTier } from '@/lib/affiliateUtils';

/**
 * GET /api/volunteer/commissions
 *
 * Returns the volunteer's commission history and current wallet balances.
 *
 * ── Lazy Unlock Strategy ──────────────────────────────────────────────────────
 * Before returning data, this route runs a single batch update to transition
 * any "pending" commissions whose 14-day lock period has expired into
 * "available" status, then updates the wallet balances accordingly.
 *
 * This is the agreed "lazy unlock" approach — no cron job needed. The unlock
 * fires whenever the volunteer views their dashboard or requests a payout.
 *
 * Auth: Volunteer role only.
 */
export async function GET() {
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

        await connectDB();

        const volunteerId = new Types.ObjectId(session.user.id);
        const now = new Date();

        // ── Step 1: Lazy unlock ───────────────────────────────────────────────
        // Find all pending commissions whose unlock date has passed.
        const unlockResult = await Commission.find({
            volunteerId,
            status:     CommissionStatus.PENDING,
            unlocksAt:  { $lte: now },
        }).select('_id commissionAmount').lean();

        if (unlockResult.length > 0) {
            const unlockedIds      = unlockResult.map((c) => c._id);
            const totalUnlocked    = unlockResult.reduce((sum, c) => sum + c.commissionAmount, 0);

            // Mark commissions as available
            await Commission.updateMany(
                { _id: { $in: unlockedIds } },
                { $set: { status: CommissionStatus.AVAILABLE } }
            );

            // Update wallet: move amount from pending → available
            // Uses atomic $inc to avoid read-modify-write races
            await Wallet.findOneAndUpdate(
                { userId: volunteerId, userType: 'volunteer' },
                {
                    $inc: {
                        pendingBalance:   -totalUnlocked,
                        availableBalance: +totalUnlocked,
                    },
                },
                { upsert: true, new: true }
            );

            console.log(
                `✅ Lazy unlock: ${unlockResult.length} commissions (EGP ${totalUnlocked}) ` +
                `unlocked for volunteer ${volunteerId}`
            );
        }

        // ── Step 2: Fetch commissions with course title ───────────────────────
        const commissions = await Commission.aggregate([
            { $match: { volunteerId } },
            { $sort:  { createdAt: -1 } },
            {
                $lookup: {
                    from:         'courses',
                    localField:   'courseId',
                    foreignField: '_id',
                    as:           'course',
                    pipeline:     [{ $project: { title: 1, thumbnail: 1 } }],
                },
            },
            { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id:              1,
                    courseId:         1,
                    orderId:          1,
                    affiliateCode:    1,
                    saleAmount:       1,
                    commissionRate:   1,
                    commissionAmount: 1,
                    status:           1,
                    unlocksAt:        1,
                    createdAt:        1,
                    payoutId:         1,
                    'course.title':   1,
                    'course.thumbnail': 1,
                },
            },
        ]);

        // ── Step 3: Fetch wallet (or return zero-state if first time) ─────────
        const wallet = await Wallet.findOne({ userId: volunteerId, userType: 'volunteer' }).lean() ?? {
            pendingBalance:   0,
            availableBalance: 0,
            totalEarned:      0,
            totalPaidOut:     0,
        };

        // ── Step 4: Compute summary stats ─────────────────────────────────────
        const totalSales   = commissions.length;
        const pendingCount = commissions.filter((c) => c.status === CommissionStatus.PENDING).length;

        // Current commission tier based on total sales
        const currentTier = getCommissionTier(totalSales);

        // Next unlock date — the soonest pending commission to unlock
        const nextUnlock = commissions
            .filter((c) => c.status === CommissionStatus.PENDING)
            .sort((a, b) => new Date(a.unlocksAt).getTime() - new Date(b.unlocksAt).getTime())[0]
            ?.unlocksAt ?? null;

        return NextResponse.json({
            success: true,
            data: {
                commissions,
                wallet: {
                    pendingBalance:   wallet.pendingBalance,
                    availableBalance: wallet.availableBalance,
                    totalEarned:      wallet.totalEarned,
                    totalPaidOut:     wallet.totalPaidOut,
                },
                summary: {
                    totalSales,
                    pendingCount,
                    nextUnlock,
                    justUnlocked: unlockResult.length, // how many were unlocked this request
                    currentTier: {
                        tier:  currentTier.tier,
                        rate:  currentTier.rate,
                        label: currentTier.label,
                        name:  currentTier.name,
                    },
                },
            },
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('❌ Commissions fetch error:', error);
        return NextResponse.json(
            { success: false, error: { message, code: 'COMMISSIONS_ERROR' } },
            { status: 500 }
        );
    }
}
