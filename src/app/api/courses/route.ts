import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import Course from '@/models/Course';
import { authOptions } from '@/lib/auth';

/**
 * Course Creation Schema
 */
const createCourseSchema = z.object({
    title: z.string().min(5).max(200),
    description: z.string().min(50).max(3000),
    category: z.string().min(1),
    price: z.number().min(0),
    thumbnail: z.string().url().optional(),
    modules: z.array(
        z.object({
            title: z.string(),
            description: z.string().optional(),
            videos: z.array(
                z.object({
                    title: z.string(),
                    url: z.string().url(),
                    transcript: z.string(),
                    duration: z.number(),
                    order: z.number(),
                })
            ),
            resources: z.array(z.string()).optional(),
            order: z.number(),
        })
    ).min(1),
});

/**
 * GET /api/courses
 * Get all published courses with filters
 */
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const category = searchParams.get('category');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '12');

        // Build query
        const query: any = { isPublished: true };

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }

        if (category && category !== 'all') {
            query.category = category;
        }

        // Get courses with pagination
        const courses = await Course.find(query)
            .populate('trainerId', 'name email profile')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const total = await Course.countDocuments(query);

        return NextResponse.json({
            success: true,
            data: {
                courses,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    totalCourses: total,
                    limit,
                },
            },
        });
    } catch (error: any) {
        console.error('Get courses error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to fetch courses',
                    code: 'FETCH_ERROR',
                },
            },
            { status: 500 }
        );
    }
}

/**
 * POST /api/courses
 * Create a new course (Trainer only)
 */
export async function POST(request: NextRequest) {
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

        if (session.user.role !== 'trainer') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Only trainers can create courses',
                        code: 'FORBIDDEN',
                    },
                },
                { status: 403 }
            );
        }

        const body = await request.json();
        const validationResult = createCourseSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: validationResult.error.errors[0].message,
                        code: 'VALIDATION_ERROR',
                    },
                },
                { status: 400 }
            );
        }

        await connectDB();

        const course = await Course.create({
            ...validationResult.data,
            trainerId: session.user.id,
            isPublished: false, // Draft by default
        });

        await course.populate('trainerId', 'name email profile');

        return NextResponse.json(
            {
                success: true,
                data: {
                    course,
                    message: 'Course created successfully!',
                },
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Create course error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: error.message || 'Failed to create course',
                    code: 'CREATE_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
