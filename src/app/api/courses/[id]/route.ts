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

        // Only show published courses to non-owners
        if (!course.isPublished) {
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
 * Permanently delete a course (Trainer only)
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'trainer') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Unauthorized - Trainer access required',
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
