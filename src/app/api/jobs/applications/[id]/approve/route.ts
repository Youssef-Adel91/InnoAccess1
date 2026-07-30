import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/db';
import Application from '@/models/Application';
import Job from '@/models/Job';
import { sendEmail, getJobAcceptanceEmailTemplate } from '@/lib/mail';
import { authOptions } from '@/lib/auth';

/**
 * POST /api/jobs/applications/[id]/approve
 * Approve a job application and send acceptance email
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json(
                { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
                { status: 401 }
            );
        }

        await connectDB();

        const { id } = await params;

        // Find the application
        const application = await Application.findById(id)
            .populate('userId', 'name email')
            .populate('jobId', 'title companyId')
            .lean();

        if (!application) {
            return NextResponse.json(
                { success: false, error: { message: 'Application not found', code: 'NOT_FOUND' } },
                { status: 404 }
            );
        }

        const jobObj = application.jobId as any;
        const userObj = application.userId as any;

        // Check if user is the job owner or admin
        const isOwner = jobObj?.companyId?.toString() === session.user.id;
        const isAdmin = session.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return NextResponse.json(
                { success: false, error: { message: 'Forbidden', code: 'FORBIDDEN' } },
                { status: 403 }
            );
        }

        // Update application status
        await Application.findByIdAndUpdate(id, { status: 'accepted' });

        // Send acceptance email
        if (userObj?.email) {
            const emailHtml = getJobAcceptanceEmailTemplate(
                userObj.name || 'Applicant',
                jobObj.title
            );

            await sendEmail({
                to: userObj.email,
                subject: `Congratulations! You've been accepted for ${jobObj.title}`,
                html: emailHtml,
            });

            console.log(`✅ Acceptance email sent to ${userObj.email} for job: ${jobObj.title}`);
        }

        return NextResponse.json({
            success: true,
            data: {
                message: 'Application approved and email sent successfully',
                application,
            },
        });
    } catch (error: any) {
        console.error('❌ Approve application error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: error.message || 'Failed to approve application',
                    code: 'APPROVAL_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
