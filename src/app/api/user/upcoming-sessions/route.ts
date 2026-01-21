import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/db';
import Enrollment from '@/models/Enrollment';
import Course from '@/models/Course';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/user/upcoming-sessions
 * Get user's upcoming live workshop sessions (within next 24 hours)
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
                        message: 'Only users can access upcoming sessions',
                        code: 'FORBIDDEN',
                    },
                },
                { status: 403 }
            );
        }

        await connectDB();

        // Get user's enrollments
        const enrollments = await Enrollment.find({ userId: session.user.id })
            .populate('courseId')
            .lean();

        // Filter for LIVE courses with sessions in the next 24 hours (and not ended)
        const now = new Date();
        const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const upcomingSessions = enrollments
            .map((enrollment: any) => enrollment.courseId)
            .filter((course: any) => {
                if (!course || course.courseType !== 'LIVE') return false;
                if (!course.liveSession?.startDate) return false;

                const sessionStart = new Date(course.liveSession.startDate);
                const sessionEnd = new Date(
                    sessionStart.getTime() + course.liveSession.durationMinutes * 60000
                );

                // Session must not be ended and must start within 24 hours
                return sessionEnd > now && sessionStart <= in24Hours;
            })
            .sort((a: any, b: any) => {
                // Sort by start date (soonest first)
                return new Date(a.liveSession.startDate).getTime() - new Date(b.liveSession.startDate).getTime();
            });

        return NextResponse.json({
            success: true,
            data: {
                sessions: upcomingSessions,
                count: upcomingSessions.length,
            },
        });
    } catch (error: any) {
        console.error('Get upcoming sessions error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to fetch upcoming sessions',
                    code: 'FETCH_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
