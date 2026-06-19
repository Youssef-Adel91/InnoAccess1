import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Wallet from '@/models/Wallet';

/**
 * GET /api/admin/finance/wallets
 *
 * Returns all Wallet documents where availableBalance > 0,
 * joined with user details (name, email, role).
 * Used by the Payouts tab to show who is owed money.
 *
 * Query params:
 *   ?userType=trainer|volunteer   (optional filter)
 *   ?page=1
 *   ?limit=50
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
        const userTypeFilter = searchParams.get('userType');
        const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
        const skip  = (page - 1) * limit;

        // ── Build match stage ─────────────────────────────────────────────────
        const matchStage: Record<string, unknown> = {
            availableBalance: { $gt: 0 },
        };
        if (userTypeFilter === 'trainer' || userTypeFilter === 'volunteer') {
            matchStage.userType = userTypeFilter;
        }

        const [wallets, total] = await Promise.all([
            Wallet.aggregate([
                { $match: matchStage },
                { $sort:  { availableBalance: -1 } }, // highest balance first
                { $skip:  skip },
                { $limit: limit },

                // Join user details
                {
                    $lookup: {
                        from:         'users',
                        localField:   'userId',
                        foreignField: '_id',
                        as:           'user',
                        pipeline: [{
                            $project: { name: 1, email: 1, role: 1, affiliateCode: 1 },
                        }],
                    },
                },
                { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },

                {
                    $project: {
                        _id:              1,
                        userId:           1,
                        userType:         1,
                        availableBalance: 1,
                        pendingBalance:   1,
                        totalEarned:      1,
                        totalPaidOut:     1,
                        updatedAt:        1,
                        user: {
                            _id:           '$user._id',
                            name:          '$user.name',
                            email:         '$user.email',
                            role:          '$user.role',
                            affiliateCode: '$user.affiliateCode',
                        },
                    },
                },
            ]),

            Wallet.countDocuments(matchStage),
        ]);

        // ── Totals for summary row ────────────────────────────────────────────
        const [totals] = await Wallet.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id:             null,
                    totalOwed:       { $sum: '$availableBalance' },
                    trainerOwed:     { $sum: { $cond: [{ $eq: ['$userType', 'trainer']   }, '$availableBalance', 0] } },
                    volunteerOwed:   { $sum: { $cond: [{ $eq: ['$userType', 'volunteer'] }, '$availableBalance', 0] } },
                },
            },
        ]);

        return NextResponse.json({
            success: true,
            data: {
                wallets,
                totals: {
                    totalOwed:     totals?.totalOwed     ?? 0,
                    trainerOwed:   totals?.trainerOwed   ?? 0,
                    volunteerOwed: totals?.volunteerOwed ?? 0,
                },
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
        console.error('❌ Finance wallets list error:', error);
        return NextResponse.json(
            { success: false, error: { message, code: 'WALLETS_LIST_ERROR' } },
            { status: 500 }
        );
    }
}
