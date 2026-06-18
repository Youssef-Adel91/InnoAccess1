import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Commission from '@/models/Commission';
import { getCommissionTier } from '@/lib/affiliateUtils';

/**
 * GET /api/volunteer/leaderboard
 *
 * Returns the top 10 volunteers globally, ranked by total number of
 * commissions (= total referral sales), with their tier information.
 *
 * Response shape:
 * {
 *   success: true,
 *   data: {
 *     leaderboard: Array<{
 *       rank:       number;
 *       volunteerId: string;
 *       name:       string;
 *       totalSales: number;
 *       tier:       { tier: 1|2|3; rate: number; label: string; name: string };
 *     }>;
 *     currentUserRank: number | null;  // null if current user not in top 10
 *   }
 * }
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
        const currentUserId   = session.user.id;
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
