import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import User, { UserRole } from '@/models/User';
import Commission from '@/models/Commission';
import mongoose from 'mongoose';

/**
 * GET /api/admin/volunteers
 *
 * Admin-only endpoint. Returns all users with role "volunteer",
 * enriched with aggregated commission stats (totalSalesCount, totalOwed).
 *
 * Query params:
 *   page   – page number (default 1)
 *   limit  – page size (default 50, max 200)
 *   search – optional partial name or email search (case-insensitive)
 */
export async function GET(request: NextRequest) {
    try {
        // ── Auth guard: admins only ──────────────────────────────────────────────
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== UserRole.ADMIN) {
            return NextResponse.json(
                { success: false, error: { message: 'Forbidden', code: 'FORBIDDEN' } },
                { status: 403 }
            );
        }

        // ── Query params ─────────────────────────────────────────────────────────
        const { searchParams } = new URL(request.url);
        const page   = Math.max(1, parseInt(searchParams.get('page')  || '1',  10));
        const limit  = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
        const search = searchParams.get('search')?.trim();

        // ── Build query ──────────────────────────────────────────────────────────
        const query: Record<string, unknown> = { role: UserRole.VOLUNTEER };

        if (search) {
            query.$or = [
                { name:  { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;

        await connectDB();

        // ── Fetch volunteers (paginated) ─────────────────────────────────────────
        const [volunteers, total] = await Promise.all([
            User.find(query)
                .select(
                    '_id name email isActive isVerified affiliateCode ' +
                    'affiliateCodeGeneratedAt createdAt updatedAt'
                )
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(query),
        ]);

        if (volunteers.length === 0) {
            return NextResponse.json({
                success: true,
                data: {
                    volunteers: [],
                    pagination: {
                        page, limit, total: 0,
                        totalPages: 0, hasNextPage: false, hasPrevPage: false,
                    },
                },
            });
        }

        // ── Aggregate commission stats per volunteer ──────────────────────────────
        const volunteerIds = volunteers.map((v) => v._id);

        const stats = await Commission.aggregate([
            { $match: { volunteerId: { $in: volunteerIds } } },
            {
                $group: {
                    _id:             '$volunteerId',
                    totalSalesCount: { $sum: 1 },
                    totalOwed:       { $sum: '$commissionAmount' },
                    totalRevenue:    { $sum: '$saleAmount' },
                },
            },
        ]);

        // Index stats by volunteerId string for O(1) lookup
        const statsMap = new Map<string, { totalSalesCount: number; totalOwed: number; totalRevenue: number }>();
        for (const s of stats) {
            statsMap.set(s._id.toString(), {
                totalSalesCount: s.totalSalesCount,
                totalOwed:       s.totalOwed,
                totalRevenue:    s.totalRevenue,
            });
        }

        // ── Merge ─────────────────────────────────────────────────────────────────
        const enriched = volunteers.map((vol) => {
            const s = statsMap.get((vol._id as mongoose.Types.ObjectId).toString());
            return {
                ...vol,
                totalSalesCount: s?.totalSalesCount ?? 0,
                totalOwed:       s?.totalOwed       ?? 0,
                totalRevenue:    s?.totalRevenue     ?? 0,
            };
        });

        return NextResponse.json({
            success: true,
            data: {
                volunteers: enriched,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages:  Math.ceil(total / limit),
                    hasNextPage: page * limit < total,
                    hasPrevPage: page > 1,
                },
            },
        });
    } catch (error: any) {
        console.error('[Admin Volunteers API] Error:', error);
        return NextResponse.json(
            { success: false, error: { message: error.message || 'Internal server error', code: 'SERVER_ERROR' } },
            { status: 500 }
        );
    }
}
