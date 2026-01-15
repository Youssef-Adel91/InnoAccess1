import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/db';
import Job from '@/models/Job';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/jobs/[id]/applicants
 * Get all applicants for a job (Company owner or Admin only)
 * 
 * SECURITY: This endpoint is protected - only job owner can access applicant data
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Authentication required',
                        code: 'UNAUTHORIZED',
                    },
                },
                { status: 401 }
            );
        }

        await connectDB();

        const { id } = await params;

        const job = await Job.findById(id);

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

        // SECURITY: Verify ownership using proper ObjectId comparison
        const isOwner = job.companyId.equals(session.user.id);
        const isAdmin = session.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'You can only view applicants for your own jobs',
                        code: 'FORBIDDEN',
                    },
                },
                { status: 403 }
            );
        }

        // Fetch applicants with pagination
        const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
        const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        // Populate applicants (only for authorized users)
        const jobWithApplicants = await Job.findById(id)
            .populate({
                path: 'applicants',
                options: {
                    limit,
                    skip,
                    sort: { appliedAt: -1 },
                },
                populate: {
                    path: 'userId',
                    select: 'name email profile',
                },
            })
            .lean();

        const totalApplicants = job.applicants.length;

        return NextResponse.json({
            success: true,
            data: {
                applicants: jobWithApplicants?.applicants || [],
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalApplicants / limit),
                    totalApplicants,
                    limit,
                },
            },
        });
    } catch (error: any) {
        console.error('Get applicants error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to fetch applicants',
                    code: 'FETCH_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
