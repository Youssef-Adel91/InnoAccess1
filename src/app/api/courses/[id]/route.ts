import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/db';
import Course from '@/models/Course';
import Category from '@/models/Category';
import User from '@/models/User';
import Enrollment from '@/models/Enrollment';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/courses/[id]
 * Get single course details
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Ensure models are registered before queries
        await connectDB();

        // Force load referenced models first
        const _ = Category; // Ensure Category is registered
        const __ = User; // Ensure User is registered

        const course = await Course.findById(id)
            .populate('categoryId', 'name slug')
            .populate('trainerId', 'name email')
            .lean();

        if (!course) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Course not found',
                        code: 'NOT_FOUND',
                    },
                },
                { status: 404 }
            );
        }

        const session = await getServerSession(authOptions);
        const isOwner = session?.user?.id === (course.trainerId as any)?._id?.toString() || session?.user?.id === course.trainerId?.toString();
        const isAdmin = session?.user?.role === 'admin';

        // Only show published courses to non-owners
        if (!course.isPublished && !isOwner && !isAdmin) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Course not available',
                        code: 'NOT_PUBLISHED',
                    },
                },
                { status: 403 }
            );
        }

        // RBAC Check
        const userRole = session?.user?.role || 'user';
        const allowedRoles = Array.isArray(course.allowedRoles) && course.allowedRoles.length > 0
            ? course.allowedRoles 
            : ['user', 'company', 'trainer', 'admin', 'volunteer'];
        
        if (!isOwner && !isAdmin && !allowedRoles.includes(userRole)) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'You do not have permission to view this course.',
                        code: 'FORBIDDEN_ROLE',
                    },
                },
                { status: 403 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                course: JSON.parse(JSON.stringify(course)),
            },
        });
    } catch (error: any) {
        console.error('Get course error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to fetch course',
                    code: 'FETCH_ERROR',
                },
            },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/courses/[id]
 * Permanently delete a course (Trainer or Company who owns it, or Admin)
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !['trainer', 'company', 'admin'].includes(session.user.role)) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Unauthorized - must be a trainer, company, or admin',
                        code: 'UNAUTHORIZED',
                    },
                },
                { status: 403 }
            );
        }

        await connectDB();

        const { id } = await params;

        // Find the course
        const course = await Course.findById(id);

        if (!course) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Course not found',
                        code: 'NOT_FOUND',
                    },
                },
                { status: 404 }
            );
        }

        // Verify ownership
        if (course.trainerId.toString() !== session.user.id) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'You can only delete your own courses',
                        code: 'FORBIDDEN',
                    },
                },
                { status: 403 }
            );
        }

        // Check for active enrollments
        const enrollmentCount = await Enrollment.countDocuments({ courseId: id });

        if (enrollmentCount > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: `Cannot delete course with ${enrollmentCount} enrolled student(s). Please unpublish instead.`,
                        code: 'HAS_ENROLLMENTS',
                    },
                },
                { status: 400 }
            );
        }

        // Delete the course
        await Course.findByIdAndDelete(id);

        console.log(`✅ Course deleted: ${course.title} (${id})`);

        return NextResponse.json({
            success: true,
            data: {
                message: 'Course deleted successfully',
            },
        });
    } catch (error: any) {
        console.error('Delete course error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: error.message || 'Failed to delete course',
                    code: 'DELETE_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
