import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import Job from '@/models/Job';
import Application, { ApplicationStatus } from '@/models/Application';
import Notification, { NotificationType } from '@/models/Notification';
import { authOptions } from '@/lib/auth';

/**
 * Application Schema
 */
const applySchema = z.object({
    cvUrl: z.string().url('Invalid CV URL'),
    coverLetter: z.string().max(2000).optional(),
});

/**
 * POST /api/jobs/[id]/apply
 * Apply for a job
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'user') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Only users can apply for jobs',
                        code: 'UNAUTHORIZED',
                    },
                },
                { status: 401 }
            );
        }

        const body = await request.json();
        const validationResult = applySchema.safeParse(body);

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

        // Check if job exists and is active
        const job = await Job.findById(params.id);

        if (!job) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Job not found',
                        code: 'NOT_FOUND',
                    },
                },
                { status: 404 }
            );
        }

        if (job.status !== 'active') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'This job is no longer accepting applications',
                        code: 'JOB_CLOSED',
                    },
                },
                { status: 400 }
            );
        }

        // Check if user already applied
        const existingApplication = await Application.findOne({
            jobId: params.id,
            userId: session.user.id,
        });

        if (existingApplication) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'You have already applied for this job',
                        code: 'ALREADY_APPLIED',
                    },
                },
                { status: 409 }
            );
        }

        // Create application
        const application = await Application.create({
            jobId: params.id,
            userId: session.user.id,
            cvUrl: validationResult.data.cvUrl,
            coverLetter: validationResult.data.coverLetter,
            status: ApplicationStatus.PENDING,
        });

        // Add application to job
        job.applicants.push(application._id);
        await job.save();

        // Create notification for company
        await Notification.create({
            userId: job.companyId,
            type: NotificationType.NEW_APPLICANT,
            title: 'New Job Application',
            message: `You have a new applicant for ${job.title}`,
            link: `/company/jobs/${job._id}/applicants`,
        });

        return NextResponse.json(
            {
                success: true,
                data: {
                    application,
                    message: 'Application submitted successfully!',
                },
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Apply for job error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: error.message || 'Failed to submit application',
                    code: 'APPLICATION_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
