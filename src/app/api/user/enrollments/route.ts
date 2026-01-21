import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/db';
import Enrollment from '@/models/Enrollment';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/user/enrollments
 * Get current user's course enrollments
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Authentication required',
                        code: 'UNAUTHORIZED',
                    },
                },
                { status: 401 }
            );
        }

        // Only users can have enrollments
        if (session.user.role !== 'user') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Only users can access enrollments',
                        code: 'FORBIDDEN',
                    },
                },
                { status: 403 }
            );
        }

        await connectDB();

        const enrollments = await Enrollment.find({ userId: session.user.id })
            .populate({
                path: 'courseId',
                select: '_id title description thumbnail courseType liveSession',
            })
            .sort({ enrolledAt: -1 })
            .lean();

        return NextResponse.json({
            success: true,
            data: {
                enrollments,
                count: enrollments.length,
            },
        });
    } catch (error: any) {
        console.error('Get enrollments error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to fetch enrollments',
                    code: 'FETCH_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
