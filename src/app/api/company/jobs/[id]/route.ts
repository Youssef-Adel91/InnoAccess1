import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import Job, { JobType, JobEmploymentType, JobStatus } from '@/models/Job';
import { authOptions } from '@/lib/auth';

/**
 * Zod Schema for Job Update
 */
const updateJobSchema = z.object({
    title: z.string().min(5, 'Title must be at least 5 characters').max(200).optional(),
    description: z.string().min(50, 'Description must be at least 50 characters').max(5000).optional(),
    requirements: z.array(z.string()).min(1, 'At least one requirement is needed').optional(),
    location: z.enum(['remote', 'onsite', 'hybrid']).optional(),
    jobType: z.enum(['full-time', 'part-time', 'internship']).optional(),
    salary: z.object({
        min: z.number().min(0, 'Minimum salary cannot be negative'),
        max: z.number().min(0, 'Maximum salary cannot be negative'),
        currency: z.string().default('EGP'),
    }).refine(data => data.max >= data.min, {
        message: 'Maximum salary must be greater than or equal to minimum salary',
    }).optional(),
    contactEmail: z.string().email('Invalid contact email').optional(),
    contactPhone: z.string().optional(),
    companyLogo: z.string().url().optional().or(z.literal('')),
    status: z.enum(['published', 'draft', 'archived']).optional(),
    accessibilityFeatures: z.array(z.string()).optional(),
});

/**
 * GET /api/company/jobs/[id]
 * Get single job details
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'company') {
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

        const { id } = params;

        // Find job and verify ownership
        const job = await Job.findOne({
            _id: id,
            companyId: session.user.id,
        }).lean();

        if (!job) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Job not found or unauthorized',
                        code: 'NOT_FOUND',
                    },
                },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                job,
            },
        });
    } catch (error: any) {
        console.error('Fetch job error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to fetch job',
                    code: 'SERVER_ERROR',
                },
            },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/company/jobs/[id]
 * Update job details
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'company') {
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

        const { id } = params;
        const body = await request.json();

        // Server-side validation with Zod
        const validationResult = updateJobSchema.safeParse(body);
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

        // Find job and verify ownership
        const job = await Job.findOne({
            _id: id,
            companyId: session.user.id,
        });

        if (!job) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Job not found or unauthorized',
                        code: 'NOT_FOUND',
                    },
                },
                { status: 404 }
            );
        }

        // Update job fields
        const updateData = validationResult.data;

        if (updateData.title) job.title = updateData.title;
        if (updateData.description) job.description = updateData.description;
        if (updateData.requirements) job.requirements = updateData.requirements;
        if (updateData.location) job.type = updateData.location as JobType;
        if (updateData.jobType) job.jobType = updateData.jobType as any;
        if (updateData.salary) job.salary = updateData.salary;
        if (updateData.contactEmail) job.contactEmail = updateData.contactEmail;
        if (updateData.contactPhone !== undefined) job.contactPhone = updateData.contactPhone;
        if (updateData.companyLogo !== undefined) job.companyLogo = updateData.companyLogo || undefined;
        if (updateData.status) job.status = updateData.status as JobStatus;
        if (updateData.accessibilityFeatures) job.accessibilityFeatures = updateData.accessibilityFeatures;

        await job.save();

        return NextResponse.json({
            success: true,
            data: {
                job,
                message: 'Job updated successfully',
            },
        });
    } catch (error: any) {
        console.error('Job update error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to update job',
                    code: 'SERVER_ERROR',
                },
            },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/company/jobs/[id]
 * Soft delete job (set status to archived)
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'company') {
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

        const { id } = params;

        // Find job and verify ownership
        const job = await Job.findOne({
            _id: id,
            companyId: session.user.id,
        });

        if (!job) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Job not found or unauthorized',
                        code: 'NOT_FOUND',
                    },
                },
                { status: 404 }
            );
        }

        // Soft delete: update status to archived
        job.status = JobStatus.ARCHIVED;
        await job.save();

        return NextResponse.json({
            success: true,
            data: {
                message: 'Job archived successfully',
            },
        });
    } catch (error: any) {
        console.error('Job deletion error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to archive job',
                    code: 'SERVER_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
