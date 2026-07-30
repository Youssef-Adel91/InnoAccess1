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
 * GET /api/user/dashboard
 * Computes enrolled courses count, hours learned, completion rate, courses list, and certificates
 * using Clerk authenticated user and MongoDB models.
 */
export async function GET(request: NextRequest) {
    try {
        const clerkUser = await currentUser();

        if (!clerkUser) {
            return NextResponse.json(
                {
                    success: false,
                    error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
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
                    enrolledCoursesCount: 0,
                    hoursLearned: 0,
                    completionRate: 0,
                    courses: [],
                    certificates: [],
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

        let totalHoursLearned = 0;
        let totalCompletionPercentage = 0;
        const courses: any[] = [];
        const certificates: any[] = [];

        for (const enrollment of enrollments) {
            const course: any = enrollment.courseId;
            if (!course || !course._id) continue;

            // Calculate total videos and course duration in seconds
            let totalVideos = 0;
            let totalSeconds = 0;
            if (Array.isArray(course.modules)) {
                for (const mod of course.modules) {
                    if (Array.isArray(mod.videos)) {
                        totalVideos += mod.videos.length;
                        for (const vid of mod.videos) {
                            totalSeconds += vid.duration || 0;
                        }
                    }
                }
            }

            const completedVideosCount = Array.isArray(enrollment.progress)
                ? enrollment.progress.length
                : 0;

            const progressPercentage =
                totalVideos > 0
                    ? Math.min(100, Math.round((completedVideosCount / totalVideos) * 100))
                    : 0;

            const courseHours = totalSeconds / 3600;
            const learnedHoursForCourse =
                totalVideos > 0
                    ? courseHours * (completedVideosCount / totalVideos)
                    : 0;

            totalHoursLearned += learnedHoursForCourse;
            totalCompletionPercentage += progressPercentage;

            const courseObj = {
                _id: course._id.toString(),
                title: course.title || 'Untitled Course',
                category: course.categoryId?.name || 'Accessibility',
                instructor: course.trainerId?.name || 'InnoAccess Academy',
                progressPercentage,
                completedVideosCount,
                totalVideos,
                enrolledAt: enrollment.enrolledAt,
            };

            courses.push(courseObj);

            if (progressPercentage === 100 || enrollment.completedAt) {
                certificates.push({
                    id: enrollment._id.toString(),
                    title: course.title,
                    issuedDate: enrollment.completedAt || enrollment.enrolledAt,
                    issuer: 'InnoAccess Academy',
                });
            }
        }

        const enrolledCoursesCount = courses.length;
        const averageCompletionRate =
            enrolledCoursesCount > 0
                ? Math.round(totalCompletionPercentage / enrolledCoursesCount)
                : 0;

        return NextResponse.json({
            success: true,
            data: {
                enrolledCoursesCount,
                hoursLearned: parseFloat(totalHoursLearned.toFixed(1)),
                completionRate: averageCompletionRate,
                courses,
                certificates,
            },
        });
    } catch (error: any) {
        console.error('Dashboard Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: { message: 'Failed to fetch student dashboard data', code: 'FETCH_ERROR' },
            },
            { status: 500 }
        );
    }
}
