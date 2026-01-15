import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import Application, { ApplicationStatus } from '@/models/Application';
import Job from '@/models/Job';
import { authOptions } from '@/lib/auth';

/**
 * Zod Schema for status update
 */
const updateStatusSchema = z.object({
    status: z.enum(['accepted', 'rejected', 'shortlisted', 'viewed']),
});

/**
 * PATCH /api/company/applications/[id]/status
 * Update application status (Accept/Reject)
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'company') {
            );
        }

        await connectDB();

        const { id: applicationId } = params;
        const body = await request.json();

        // Validate input
        const validationResult = updateStatusSchema.safeParse(body);
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

        // Find application
        const application = await Application.findById(applicationId);
        if (!application) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Application not found',
                        code: 'NOT_FOUND',
                    },
                },
                { status: 404 }
            );
        }

        // Verify job ownership
        const job = await Job.findOne({
            _id: application.jobId,
            companyId: session.user.id,
        });

        if (!job) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Job not found or unauthorized',
                        code: 'UNAUTHORIZED',
                    },
                },
                { status: 403 }
            );
        }

        // Update status
        application.status = validationResult.data.status as ApplicationStatus;
        await application.save();

        // Send email notification to candidate
        try {
            const { sendApplicationStatusEmail } = await import('@/lib/email');
            const user = await import('@/models/User').then(m => m.default);

            const candidate = await user.findById(application.userId);
            if (candidate && (validationResult.data.status === 'accepted' || validationResult.data.status === 'rejected')) {
                await sendApplicationStatusEmail(
                    candidate.email,
                    candidate.name,
                    job.title,
                    validationResult.data.status as 'accepted' | 'rejected'
                );
            }
        } catch (emailError) {
            console.error('Failed to send email notification:', emailError);
            // Continue even if email fails - don't block the status update
        }

        return NextResponse.json({
            success: true,
            data: {
                application,
                message: `Application ${validationResult.data.status} successfully`,
            },
        });
    } catch (error: any) {
        console.error('Update application status error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to update application status',
                    code: 'SERVER_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
