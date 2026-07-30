import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db';
import Commission from '@/models/Commission';
import User, { UserRole } from '@/models/User';
import mongoose from 'mongoose';

/**
 * GET /api/admin/volunteers/[id]/sales
 *
 * Admin-only. Returns a paginated sales history for a specific volunteer,
 * with course title, date, saleAmount, commissionAmount, and status.
 *
 * Query params:
 *   page  – page number (default 1)
 *   limit – page size (default 20)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await currentUser();
        const userRole = (user?.publicMetadata?.role || user?.unsafeMetadata?.role) as string | undefined;
        if (!user || userRole !== 'admin') {
            return NextResponse.json(
                { success: false, error: { message: 'Forbidden', code: 'FORBIDDEN' } },
                { status: 403 }
            );
        }

        const { id } = await params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, error: { message: 'Invalid volunteer ID', code: 'INVALID_ID' } },
                { status: 400 }
            );
        }

        const { searchParams } = new URL(request.url);
        const page  = Math.max(1, parseInt(searchParams.get('page')  || '1',  10));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
        const skip  = (page - 1) * limit;

        await connectDB();

        // Verify the volunteer exists and is actually a volunteer
        const volunteer = await User.findOne({
            _id:  id,
            role: UserRole.VOLUNTEER,
        }).select('name email affiliateCode').lean();

        if (!volunteer) {
            return NextResponse.json(
                { success: false, error: { message: 'Volunteer not found', code: 'NOT_FOUND' } },
                { status: 404 }
            );
        }

        const volunteerId = new mongoose.Types.ObjectId(id);

        // Fetch commissions with course title via $lookup
        const [sales, totalArr] = await Promise.all([
            Commission.aggregate([
                { $match: { volunteerId } },
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: limit },
                {
                    $lookup: {
                        from:         'courses',
                        localField:   'courseId',
                        foreignField: '_id',
                        as:           'course',
                        pipeline:     [{ $project: { title: 1, _id: 0 } }],
                    },
                },
                {
                    $project: {
                        _id:              1,
                        createdAt:        1,
                        saleAmount:       1,
                        commissionAmount: 1,
                        commissionRate:   1,
                        status:           1,
                        affiliateCode:    1,
                        courseTitle: { $ifNull: [{ $arrayElemAt: ['$course.title', 0] }, 'Unknown Course'] },
                    },
                },
            ]),
            Commission.aggregate([
                { $match: { volunteerId } },
                { $count: 'total' },
            ]),
        ]);

        const total = totalArr[0]?.total ?? 0;

        return NextResponse.json({
            success: true,
            data: {
                volunteer: {
                    _id:           (volunteer._id as mongoose.Types.ObjectId).toString(),
                    name:          volunteer.name,
                    email:         volunteer.email,
                    affiliateCode: volunteer.affiliateCode,
                },
                sales,
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
        console.error('[Admin Volunteer Sales API] Error:', error);
        return NextResponse.json(
            { success: false, error: { message: error.message || 'Internal server error', code: 'SERVER_ERROR' } },
            { status: 500 }
        );
    }
}
