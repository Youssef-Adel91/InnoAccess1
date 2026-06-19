import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import LedgerEntry from '@/models/LedgerEntry';

/**
 * GET /api/admin/finance/ledger
 *
 * Returns a paginated, newest-first log of all LedgerEntry documents.
 * Used by the Ledger (Audit Log) tab — read-only, no mutations.
 *
 * Query params:
 *   ?entryType=GROSS_REVENUE|...    (optional filter)
 *   ?page=1
 *   ?limit=25
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
        const entryTypeFilter = searchParams.get('entryType');
        const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)));
        const skip  = (page - 1) * limit;

        const matchStage: Record<string, unknown> = {};
        if (entryTypeFilter) {
            matchStage.entryType = entryTypeFilter;
        }

        const [entries, total] = await Promise.all([
            LedgerEntry.aggregate([
                { $match: matchStage },
                { $sort:  { createdAt: -1 } },
                { $skip:  skip },
                { $limit: limit },

                // Optionally join user for TRAINER/VOLUNTEER entries
                {
                    $lookup: {
                        from:         'users',
                        localField:   'userId',
                        foreignField: '_id',
                        as:           'user',
                        pipeline: [{ $project: { name: 1, email: 1, role: 1 } }],
                    },
                },
                { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },

                // Optionally join course title
                {
                    $lookup: {
                        from:         'courses',
                        localField:   'courseId',
                        foreignField: '_id',
                        as:           'course',
                        pipeline: [{ $project: { title: 1 } }],
                    },
                },
                { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },

                {
                    $project: {
                        _id:       1,
                        entryType: 1,
                        amount:    1,
                        orderId:   1,
                        note:      1,
                        createdAt: 1,
                        user: {
                            name:  '$user.name',
                            email: '$user.email',
                            role:  '$user.role',
                        },
                        courseTitle: '$course.title',
                    },
                },
            ]),

            LedgerEntry.countDocuments(matchStage),
        ]);

        return NextResponse.json({
            success: true,
            data: {
                entries,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('❌ Finance ledger list error:', error);
        return NextResponse.json(
            { success: false, error: { message, code: 'LEDGER_LIST_ERROR' } },
            { status: 500 }
        );
    }
}
