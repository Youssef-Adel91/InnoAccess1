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
 * Note: cvUrl accepts any string (not just URLs) to support placeholder values when Cloudinary is not configured
 */
const applySchema = z.object({
    cvUrl: z.string().min(1, 'CV is required'),
    coverLetter: z.string().max(2000).optional(),
});

/**
 * POST /api/jobs/[id]/apply
 * Apply for a job
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        console.log('🔔 Job Application - Start:', id);
        const session = await getServerSession(authOptions);

        console.log('👤 User:', { exists: !!session, role: session?.user?.role });

        if (!session || session.user.role !== 'user') {
            console.log('❌ Unauthorized - not a user');
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
        console.log('📋 Application data:', { cvUrl: body.cvUrl, hasCoverLetter: !!body.coverLetter });

        const validationResult = applySchema.safeParse(body);

        if (!validationResult.success) {
            console.log('❌ Validation failed:', validationResult.error.errors);
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

        // Check if job exists and is published (accepting applications)
        const job = await Job.findById(id);

        if (!job) {
            console.log('❌ Job not found');
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

        console.log('📝 Job status:', job.status);

        // Check if job is published (not draft or archived)
        if (job.status !== 'published') {
            console.log('❌ Job not accepting applications - status:', job.status);
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
            jobId: id,
            userId: session.user.id,
        });

        if (existingApplication) {
            // If rejected, check if 24 hours have passed
            if (existingApplication.status === ApplicationStatus.REJECTED && existingApplication.rejectedAt) {
                const hoursSinceRejection = (Date.now() - existingApplication.rejectedAt.getTime()) / (1000 * 60 * 60);

                if (hoursSinceRejection < 24) {
                    const hoursRemaining = Math.ceil(24 - hoursSinceRejection);
                    return NextResponse.json(
                        {
                            success: false,
                            error: {
                                message: `You were rejected for this job. You can reapply in ${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''}`,
                                code: 'REJECTED_COOLDOWN',
                                rejectionReason: existingApplication.rejectionReason,
                                hoursRemaining,
                            },
                        },
                        { status: 409 }
                    );
                }

                // 24 hours passed, delete old application to allow reapplication
                await Application.deleteOne({ _id: existingApplication._id });
            } else {
                // Application is pending, viewed, shortlisted, or accepted
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
        }

        // Create application
        const application = await Application.create({
            jobId: id,
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
