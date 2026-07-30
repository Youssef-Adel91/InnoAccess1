import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Commission from '@/models/Commission';
import { getCommissionTier } from '@/lib/affiliateUtils';

/**
 * GET /api/volunteer/leaderboard
 *
 * Returns the top 10 volunteers globally, ranked by total number of
 * commissions (= total referral sales), with their tier information.
 *
 * Auth: Volunteer role only (using Clerk currentUser).
 */
export async function GET() {
    try {
        const clerkUser = await currentUser();

        if (!clerkUser) {
            return NextResponse.json(
                { success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
                { status: 401 }
            );
        }

        const email = clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase().trim();
        await connectDB();

        const user = await User.findOne({ email }).select('_id role');

        if (!user || (user.role !== 'volunteer' && user.role !== 'admin')) {
            return NextResponse.json(
                { success: false, error: { message: 'Volunteers only', code: 'FORBIDDEN' } },
                { status: 403 }
            );
        }

        // ── Aggregate: count commissions per volunteer ──────────────────────
        // We count ALL commissions (all statuses) as "total sales".
        const results = await Commission.aggregate([
            // Group by volunteerId and count
            {
                $group: {
                    _id:        '$volunteerId',
                    totalSales: { $sum: 1 },
                },
            },
            // Sort by total sales descending
            { $sort: { totalSales: -1 } },
            // Limit to top 10
            { $limit: 10 },
            // Join with users to get names
            {
                $lookup: {
                    from:         'users',
                    localField:   '_id',
                    foreignField: '_id',
                    as:           'user',
                    pipeline:     [{ $project: { name: 1, _id: 1 } }],
                },
            },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id:        0,
                    volunteerId: '$_id',
                    name:       { $ifNull: ['$user.name', 'Anonymous Volunteer'] },
                    totalSales: 1,
                },
            },
        ]);

        // ── Attach rank and tier ──────────────────────────────────────────────
        const leaderboard = results.map((entry, index) => {
            const tier = getCommissionTier(entry.totalSales);
            return {
                rank:        index + 1,
                volunteerId: entry.volunteerId.toString(),
                name:        entry.name,
                totalSales:  entry.totalSales,
                tier: {
                    tier:  tier.tier,
                    rate:  tier.rate,
                    label: tier.label,
                    name:  tier.name,
                },
            };
        });

        // ── Determine current user's rank in the leaderboard ─────────────────
        const currentUserId   = user._id.toString();
        const currentUserEntry = leaderboard.find((e) => e.volunteerId === currentUserId);
        const currentUserRank  = currentUserEntry?.rank ?? null;

        return NextResponse.json({
            success: true,
            data: {
                leaderboard,
                currentUserRank,
            },
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('❌ Leaderboard fetch error:', error);
        return NextResponse.json(
            { success: false, error: { message, code: 'LEADERBOARD_ERROR' } },
            { status: 500 }
        );
    }
}
