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
    rejectionReason: z.string().max(500).optional(), // Required when status is 'rejected'
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
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const { id: applicationId } = await params;
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

        // Validate rejection reason if status is rejected
        if (validationResult.data.status === 'rejected' && !validationResult.data.rejectionReason) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Rejection reason is required when rejecting an application',
                        code: 'VALIDATION_ERROR',
                    },
                },
                { status: 400 }
            );
        }

        // Update status
        application.status = validationResult.data.status as ApplicationStatus;

        // Save rejection details if status is rejected
        if (validationResult.data.status === 'rejected') {
            application.rejectionReason = validationResult.data.rejectionReason;
            application.rejectedAt = new Date();
        }

        await application.save();

        // Create in-app notification for user
        if (validationResult.data.status === 'accepted' || validationResult.data.status === 'rejected') {
            try {
                const { notifyApplicationStatusUpdate } = await import('@/lib/notifications');
                await notifyApplicationStatusUpdate(
                    application.userId.toString(),
                    job.title,
                    validationResult.data.status as 'accepted' | 'rejected' | 'shortlisted',
                    job._id.toString()
                );
            } catch (notifError) {
                console.error('Failed to create notification:', notifError);
                // Continue - don't block status update
            }
        }

        // Send email notification to candidate
        try {
            const { sendApplicationStatusEmail } = await import('@/lib/email');
            const User = await import('@/models/User').then(m => m.default);

            const candidate = await User.findById(application.userId);
            if (candidate && (validationResult.data.status === 'accepted' || validationResult.data.status === 'rejected')) {
                // Fetch company details for contact information (only for accepted applications)
                let companyName, companyEmail, companyPhone;

                if (validationResult.data.status === 'accepted') {
                    const company = await User.findById(job.companyId);
                    if (company) {
                        companyName = company.profile?.companyName || company.name;
                        companyEmail = company.email;
                        companyPhone = company.profile?.phone;
                    }
                }

                await sendApplicationStatusEmail(
                    candidate.email,
                    candidate.name,
                    job.title,
                    validationResult.data.status as 'accepted' | 'rejected',
                    companyName,
                    companyEmail,
                    companyPhone
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
