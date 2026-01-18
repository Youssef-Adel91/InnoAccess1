import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import Job, { JobType, JobStatus } from '@/models/Job';
import { authOptions } from '@/lib/auth';

/**
 * Job Creation Schema
 */
const createJobSchema = z.object({
    title: z.string().min(5).max(200),
    description: z.string().min(50).max(5000),
    requirements: z.array(z.string()).min(1),
    salary: z.object({
        min: z.number().min(0),
        max: z.number().min(0),
        currency: z.string().default('EGP'),
    }),
    location: z.string().min(1),
    type: z.enum(['remote', 'onsite', 'hybrid']),
    accessibilityFeatures: z.array(z.string()).optional().default([]),
    expiresAt: z.string().optional(),
});

/**
 * GET /api/jobs
 * Get all jobs with optional filters
 */
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const location = searchParams.get('location');
        const type = searchParams.get('type');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');

        // Build query - only show published jobs to public
        const query: any = { status: JobStatus.PUBLISHED };

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }

        if (location && location !== 'all') {
            query.location = { $regex: location, $options: 'i' };
        }

        if (type && type !== 'all') {
            query.type = type;
        }

        // Get jobs with pagination
        const jobs = await Job.find(query)
            .populate('companyId', 'name email profile')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const total = await Job.countDocuments(query);

        return NextResponse.json({
            success: true,
            data: {
                jobs,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    totalJobs: total,
                    limit,
                },
            },
        });
    } catch (error: any) {
        console.error('Get jobs error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to fetch jobs',
                    code: 'FETCH_ERROR',
                },
            },
            { status: 500 }
        );
    }
}

/**
 * POST /api/jobs
 * Create a new job (Company only)
 */
export async function POST(request: NextRequest) {
    try {
        // Check authentication
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

        // Check if user is a company and approved
        if (session.user.role !== 'company') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Only companies can post jobs',
                        code: 'FORBIDDEN',
                    },
                },
                { status: 403 }
            );
        }

        if (!session.user.isApproved) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Your company account is pending approval',
                        code: 'PENDING_APPROVAL',
                    },
                },
                { status: 403 }
            );
        }

        // Parse and validate request body
        const body = await request.json();
        const validationResult = createJobSchema.safeParse(body);

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

        const jobData = validationResult.data;

        // Connect to database
        await connectDB();

        // Create job
        const job = await Job.create({
            ...jobData,
            companyId: session.user.id,
            status: JobStatus.PUBLISHED,
        });

        // Populate company info
        await job.populate('companyId', 'name email profile');

        return NextResponse.json(
            {
                success: true,
                data: {
                    job,
                    message: 'Job posted successfully!',
                },
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Create job error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: error.message || 'Failed to create job',
                    code: 'CREATE_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
