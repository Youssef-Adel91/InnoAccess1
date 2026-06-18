import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Payout, { PayoutStatus } from '@/models/Payout';

/**
 * GET /api/admin/payouts
 *
 * Returns the full payout queue for admin review, joined with volunteer
 * user details (name, email, affiliateCode) via aggregation.
 *
 * Query params:
 *   ?status=pending|approved|paid|rejected   (optional filter)
 *   ?page=1                                  (1-based, default 1)
 *   ?limit=20                                (default 20)
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

        // Build the match stage — only filter by status if explicitly requested
        const matchStage: Record<string, unknown> = {};
        if (statusFilter && Object.values(PayoutStatus).includes(statusFilter as PayoutStatus)) {
            matchStage.status = statusFilter;
        }

        // ── Aggregation: join volunteer details + commission count ─────────────
        const [results, totalDocs] = await Promise.all([
            Payout.aggregate([
                { $match: matchStage },
                { $sort:  { createdAt: -1 } },
                { $skip:  skip },
                { $limit: limit },

                // Join with volunteer user
                {
                    $lookup: {
                        from:     'users',
                        localField:   'volunteerId',
                        foreignField: '_id',
                        as:           'volunteer',
                        pipeline: [
                            {
                                $project: {
                                    name:          1,
                                    email:         1,
                                    affiliateCode: 1,
                                },
                            },
                        ],
                    },
                },
                { $unwind: { path: '$volunteer', preserveNullAndEmpty: true } },

                // Join with admin who processed it (if any)
                {
                    $lookup: {
                        from:     'users',
                        localField:   'processedBy',
                        foreignField: '_id',
                        as:           'processor',
                        pipeline: [{ $project: { name: 1, email: 1 } }],
                    },
                },
                {
                    $unwind: { path: '$processor', preserveNullAndEmpty: true },
                },

                // Project clean fields
                {
                    $project: {
                        _id:            1,
                        amount:         1,
                        method:         1,
                        accountNumber:  1,
                        status:         1,
                        adminNote:      1,
                        processedAt:    1,
                        createdAt:      1,
                        commissionCount: { $size: '$commissionIds' },

                        volunteer: {
                            _id:          '$volunteer._id',
                            name:         '$volunteer.name',
                            email:        '$volunteer.email',
                            affiliateCode:'$volunteer.affiliateCode',
                        },
                        processedBy: {
                            name:  '$processor.name',
                            email: '$processor.email',
                        },
                    },
                },
            ]),

            // Total count for pagination (no skip/limit)
            Payout.countDocuments(matchStage),
        ]);

        // ── Status breakdown for the filter tabs ──────────────────────────────
        const statusCounts = await Payout.aggregate([
            {
                $group: {
                    _id:   '$status',
                    count: { $sum: 1 },
                },
            },
        ]);

        const countsByStatus = Object.fromEntries(
            statusCounts.map(({ _id, count }) => [_id, count])
        ) as Record<string, number>;

        return NextResponse.json({
            success: true,
            data: {
                payouts:    results,
                pagination: {
                    page,
                    limit,
                    total:      totalDocs,
                    totalPages: Math.ceil(totalDocs / limit),
                },
                counts: {
                    all:      totalDocs,
                    pending:  countsByStatus.pending  ?? 0,
                    approved: countsByStatus.approved ?? 0,
                    paid:     countsByStatus.paid     ?? 0,
                    rejected: countsByStatus.rejected ?? 0,
                },
            },
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('❌ Admin payouts list error:', error);
        return NextResponse.json(
            { success: false, error: { message, code: 'ADMIN_PAYOUTS_ERROR' } },
            { status: 500 }
        );
    }
}
