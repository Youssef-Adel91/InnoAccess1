import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/db';
import Job, { JobStatus } from '@/models/Job';
import { authOptions } from '@/lib/auth';

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
