import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/db';
import Job from '@/models/Job';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/jobs/[id]
 * Get a single job by ID
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();

        const { id } = await params;

        // SECURITY: Do NOT populate applicants in public endpoint
        // Applicant data contains sensitive PII (emails, CVs, cover letters)
        // Only job owner should access via /api/jobs/[id]/applicants
        const job = await Job.findById(id)
            .populate('companyId', 'name profile.companyName profile.companyLogo')
            .select('-applicants') // Explicitly exclude applicants array
            .lean();

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

        return NextResponse.json({
            success: true,
            data: { job },
        });
    } catch (error: any) {
        console.error('Get job error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to fetch job',
                    code: 'FETCH_ERROR',
                },
            },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/jobs/[id]
 * Update a job (Company owner only)
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

        // Check ownership
        if (job.companyId.toString() !== session.user.id) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'You can only edit your own jobs',
                        code: 'FORBIDDEN',
                    },
                },
                { status: 403 }
            );
        }

        const body = await request.json();
        const updatedJob = await Job.findByIdAndUpdate(params.id, body, {
            new: true,
            runValidators: true,
        }).populate('companyId', 'name email profile');

        return NextResponse.json({
            success: true,
            data: { job: updatedJob },
        });
    } catch (error: any) {
        console.error('Update job error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to update job',
                    code: 'UPDATE_ERROR',
                },
            },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/jobs/[id]
 * Delete a job (Company owner or Admin only)
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
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

        // Check ownership or admin
        if (
            session.user.role !== 'admin' &&
            job.companyId.toString() !== session.user.id
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'You can only delete your own jobs',
                        code: 'FORBIDDEN',
                    },
                },
                { status: 403 }
            );
        }

        await Job.findByIdAndDelete(params.id);

        return NextResponse.json({
            success: true,
            data: { message: 'Job deleted successfully' },
        });
    } catch (error: any) {
        console.error('Delete job error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to delete job',
                    code: 'DELETE_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
