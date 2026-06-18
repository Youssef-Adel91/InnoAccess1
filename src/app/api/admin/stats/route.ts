import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Job from '@/models/Job';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';
import Application from '@/models/Application';
import Resume from '@/models/Resume';
import Notification, { NotificationType } from '@/models/Notification';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/admin/stats
 * Get platform statistics (Admin only)
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'admin') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Admin access required',
                        code: 'FORBIDDEN',
                    },
                },
                { status: 403 }
            );
        }

        await connectDB();

        // Get statistics
        const [
            totalUsers,
            totalCompanies,
            totalTrainers,
            totalVolunteers,
            pendingCompanies,
            activeJobs,
            totalCourses,
            publishedCourses,
            totalEnrollments,
            totalApplications,
            totalResumes,
        ] = await Promise.all([
            User.countDocuments({ role: 'user' }),
            User.countDocuments({ role: 'company' }),
            User.countDocuments({ role: 'trainer' }),
            User.countDocuments({ role: 'volunteer' }),
            User.countDocuments({ role: 'company', isApproved: false }),
            Job.countDocuments({ status: 'active' }),
            Course.countDocuments(),
            Course.countDocuments({ isPublished: true }),
            Enrollment.countDocuments(),
            Application.countDocuments(),
            Resume.countDocuments(),
        ]);

        return NextResponse.json({
            success: true,
            data: {
                users: {
                    total: totalUsers,
                    companies: totalCompanies,
                    trainers: totalTrainers,
                    volunteers: totalVolunteers,
                    pendingApprovals: pendingCompanies,
                },
                jobs: {
                    active: activeJobs,
                },
                courses: {
                    total: totalCourses,
                    published: publishedCourses,
                },
                enrollments: {
                    total: totalEnrollments,
                },
                applications: {
                    total: totalApplications,
                },
                resumes: {
                    total: totalResumes,
                },
            },
        });
    } catch (error: any) {
        console.error('Get admin stats error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to fetch statistics',
                    code: 'FETCH_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
