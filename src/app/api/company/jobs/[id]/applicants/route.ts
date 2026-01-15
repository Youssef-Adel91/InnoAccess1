import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/db';
import Job from '@/models/Job';
import Application from '@/models/Application';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/company/jobs/[id]/applicants
 * Get all applicants for a specific job
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'company') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const { id: jobId } = await params;

        // Verify job ownership
        const job = await Job.findOne({
            _id: jobId,
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

        // Get all applications for this job with user details
        const applications = await Application.find({ jobId })
            .populate('userId', 'name email profile')
            .sort({ appliedAt: -1 })
            .lean();

        return NextResponse.json({
            success: true,
            data: {
                applicants: applications,
                count: applications.length,
                jobTitle: job.title,
            },
        });
    } catch (error: any) {
        console.error('Fetch applicants error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to fetch applicants',
                    code: 'SERVER_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
