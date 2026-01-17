import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Course from '@/models/Course';
import Category from '@/models/Category';
import User from '@/models/User';

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
