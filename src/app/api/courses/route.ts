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
 * 
 * Includes retry logic for MongoDB cold starts in serverless environment
 */
export async function GET(request: NextRequest) {
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Retry connection with exponential backoff
            if (attempt > 1) {
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                console.log(`🔄 Retry attempt ${attempt}/${maxRetries} after ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

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

            // Special handling for Zoom Meetings category (shows all LIVE courses)
            if (category && category !== 'all') {
                // Check if this is the Zoom Meetings category by ID
                const Category = (await import('@/models/Category')).default;
                const zoomCategory = await Category.findOne({ slug: 'zoom-meetings' });

                if (zoomCategory && category === zoomCategory._id.toString()) {
                    // Filter by courseType instead of categoryId
                    query.courseType = 'LIVE';
                } else {
                    // Normal category filter
                    query.categoryId = category;
                }
            }

            // Get courses with pagination
            const courses = await Course.find(query)
                .populate('categoryId', 'name slug')
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
            lastError = error;
            console.error(`❌ Attempt ${attempt}/${maxRetries} failed:`, error.message);

            // If this is not the last attempt, continue to retry
            if (attempt < maxRetries) {
                continue;
            }

            // Last attempt failed, return error
            console.error('❌ All retry attempts failed:', error);
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Failed to fetch courses. Please try again.',
                        code: 'FETCH_ERROR',
                        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
                    },
                },
                { status: 500 }
            );
        }
    }

    // Fallback (should never reach here)
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
