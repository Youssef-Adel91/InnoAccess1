import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import TrainerProfile from '@/models/TrainerProfile';

/**
 * GET /api/admin/trainers
 *
 * Returns all trainer profiles joined with the User record to surface:
 *   - User.name, User.email, User.profile.avatar  (from the User document)
 *   - TrainerProfile.specialization, bio, cvUrl, status, linkedInUrl
 *
 * Avatar lives at User.profile.avatar — we join it here, NOT by adding a
 * duplicate field to TrainerProfile (normalized schema as per spec).
 *
 * Query params:
 *   ?status=pending|approved|rejected  (optional; defaults to all)
 *   ?page=1  &limit=20
 *
 * Auth: Admin only.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: { message: 'Admin access required', code: 'FORBIDDEN' } },
                { status: 403 }
            );
        }

        await connectDB();

        const { searchParams } = new URL(req.url);
        const statusFilter = searchParams.get('status');
        const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10));
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
        const skip  = (page - 1) * limit;

        // Validate status filter against known enum values
        const validStatuses = ['pending', 'approved', 'rejected'];
        const matchStage: Record<string, unknown> = {};
        if (statusFilter && validStatuses.includes(statusFilter)) {
            matchStage.status = statusFilter;
        }

        // ── Aggregation: TrainerProfile → User (left join on userId) ─────────
        // We project only the fields we need from User so we never accidentally
        // expose password hashes or other sensitive fields.
        const [trainers, total] = await Promise.all([
            TrainerProfile.aggregate([
                { $match: matchStage },
                { $sort:  { createdAt: -1 } },
                { $skip:  skip  },
                { $limit: limit },

                {
                    $lookup: {
                        from:         'users',
                        localField:   'userId',
                        foreignField: '_id',
                        as:           'user',
                        pipeline: [
                            {
                                $project: {
                                    name:             1,
                                    email:            1,
                                    // Avatar lives at User.profile.avatar — normalized join
                                    'profile.avatar': 1,
                                    createdAt:        1,
                                },
                            },
                        ],
                    },
                },
                // A TrainerProfile without a User record is orphaned data — skip it
                { $match: { user: { $ne: [] } } },
                { $unwind: '$user' },

                {
                    $project: {
                        _id:            1,
                        userId:         1,
                        status:         1,
                        specialization: 1,
                        bio:            1,
                        cvUrl:          1,
                        linkedInUrl:    1,
                        websiteUrl:     1,
                        createdAt:      1,
                        // Flatten user fields to top level for easy frontend consumption
                        name:           '$user.name',
                        email:          '$user.email',
                        // Safely extract nested avatar — null if not set
                        avatar:         '$user.profile.avatar',
                        memberSince:    '$user.createdAt',
                    },
                },
            ]),

            TrainerProfile.countDocuments(matchStage),
        ]);

        // ── Status counts for filter tabs ─────────────────────────────────────
        const statusCounts = await TrainerProfile.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        const counts = Object.fromEntries(
            statusCounts.map(({ _id, count }) => [_id, count])
        ) as Record<string, number>;

        return NextResponse.json({
            success: true,
            data: {
                trainers,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
                counts: {
                    all:      total,
                    pending:  counts.pending  ?? 0,
                    approved: counts.approved ?? 0,
                    rejected: counts.rejected ?? 0,
                },
            },
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('❌ Admin trainers fetch error:', error);
        return NextResponse.json(
            { success: false, error: { message, code: 'TRAINERS_ERROR' } },
            { status: 500 }
        );
    }
}
