import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import Job, { JobType, JobEmploymentType, JobStatus } from '@/models/Job';
import User from '@/models/User';
import { authOptions } from '@/lib/auth';

/**
 * Zod Schema for Job Creation with Server-Side Validation
 */
const createJobSchema = z.object({
    title: z.string().min(5, 'Title must be at least 5 characters').max(200),
    description: z.string().min(50, 'Description must be at least 50 characters').max(5000),
    requirements: z.array(z.string()).min(1, 'At least one requirement is needed'),
    location: z.enum(['remote', 'onsite', 'hybrid']),
    jobType: z.enum(['full-time', 'part-time', 'internship']),
    salary: z.object({
        min: z.number().min(0, 'Minimum salary cannot be negative'),
        max: z.number().min(0, 'Maximum salary cannot be negative'),
        currency: z.string().default('EGP'),
    }).refine(data => data.max >= data.min, {
        message: 'Maximum salary must be greater than or equal to minimum salary',
    }),
    contactEmail: z.string().email('Invalid contact email'),
    contactPhone: z.string().optional(),
    companyLogo: z.string().url().optional(),
    status: z.enum(['published', 'draft']),
    accessibilityFeatures: z.array(z.string()).optional(),
});

/**
 * POST /api/company/jobs
 * Create new job posting (Company only)
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // Check authentication and role
        if (!session || session.user.role !== 'company') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Unauthorized - Company access required',
                        code: 'UNAUTHORIZED',
                    },
                },
                { status: 401 }
            );
        }

        await connectDB();

        // Verify company is approved
        const company = await User.findById(session.user.id);
        if (!company || !company.isApproved) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Account not verified yet. Please wait for admin approval.',
                        code: 'NOT_VERIFIED',
                    },
                },
                { status: 403 }
            );
        }

        const body = await request.json();

        // Server-side validation with Zod
        const validationResult = createJobSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: validationResult.error.errors[0].message,
                        code: 'VALIDATION_ERROR',
                        details: validationResult.error.errors,
                    },
                },
                { status: 400 }
            );
        }

        const jobData = validationResult.data;

        // Create job
        const job = await Job.create({
            ...jobData,
            type: jobData.location as JobType,
            companyId: session.user.id,
        });

        return NextResponse.json(
            {
                success: true,
                data: {
                    job,
                    message: jobData.status === 'published'
                        ? 'Job posted successfully!'
                        : 'Job saved as draft',
                },
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Job creation error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to create job',
                    code: 'SERVER_ERROR',
                },
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/company/jobs
 * List all jobs for authenticated company
 */
export async function GET(request: NextRequest) {
    try {
        console.log('🔍 GET /api/company/jobs - Start');
        const session = await getServerSession(authOptions);

        console.log('👤 Session:', {
            exists: !!session,
            userId: session?.user?.id,
            role: session?.user?.role,
        });

        if (!session || session.user.role !== 'company') {
            console.log('❌ Unauthorized - no session or not company');
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Unauthorized',
                        code: 'UNAUTHORIZED',
                    },
                },
                { status: 401 }
            );
        }

        await connectDB();

        const { searchParams } = new URL(request.url);
        const statusFilter = searchParams.get('status') || 'all';

        console.log('🔎 Filter:', statusFilter);

        // Build query
        const query: any = { companyId: session.user.id };

        if (statusFilter !== 'all') {
            query.status = statusFilter;
        } else {
            // Exclude archived jobs by default
            query.status = { $ne: JobStatus.ARCHIVED };
        }

        console.log('📋 Query:', JSON.stringify(query));

        // Get jobs with applicant count
        let jobs;
        try {
            console.log('🔄 Executing Job.find...');
            jobs = await Job.find(query)
                .sort({ createdAt: -1 })
                .lean();
            console.log('✅ Query executed successfully');
        } catch (dbError: any) {
            console.error('❌ Database query error:', dbError);
            throw dbError;
        }

        console.log('✅ Found jobs:', jobs.length);

        // Get applicant count from Application model
        const Application = (await import('@/models/Application')).default;

        const jobsWithCount = await Promise.all(
            jobs.map(async (job) => {
                const applicantCount = await Application.countDocuments({ jobId: job._id });
                return {
                    ...job,
                    applicantCount,
                };
            })
        );

        return NextResponse.json({
            success: true,
            data: {
                jobs: jobsWithCount,
                count: jobsWithCount.length,
            },
        });
    } catch (error: any) {
        console.error('❌ Fetch jobs error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to fetch jobs',
                    code: 'SERVER_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
