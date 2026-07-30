import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';
import User from '@/models/User';
import Category from '@/models/Category';

// Explicitly register all Mongoose models used in populate
Course; Enrollment; User; Category;

/**
 * GET /api/user/enrollments
 * Get current user's course enrollments using Clerk auth
 */
export async function GET(request: NextRequest) {
    try {
        const clerkUser = await currentUser();

        if (!clerkUser) {
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

        const email = clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase().trim();
        await connectDB();

        const mongoUser = await User.findOne({ email });
        if (!mongoUser) {
            return NextResponse.json({
                success: true,
                data: {
                    enrollments: [],
                    count: 0,
                },
            });
        }

        const enrollments = await Enrollment.find({ userId: mongoUser._id })
            .populate({
                path: 'courseId',
                select: '_id title description thumbnail courseType liveSession trainerId categoryId modules',
                populate: [
                    { path: 'trainerId', select: 'name email' },
                    { path: 'categoryId', select: 'name' }
                ],
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
        console.error('Enrollments Error:', error);
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
