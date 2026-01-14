import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Notification, { NotificationType } from '@/models/Notification';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/admin/companies/pending
 * Get pending company approvals (Admin only)
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'admin') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Admin access required',
                        code: 'FORBIDDEN',
                    },
                },
                { status: 403 }
            );
        }

        await connectDB();

        const pendingCompanies = await User.find({
            role: 'company',
            isApproved: false,
        })
            .select('-password')
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({
            success: true,
            data: { companies: pendingCompanies },
        });
    } catch (error: any) {
        console.error('Get pending companies error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to fetch pending companies',
                    code: 'FETCH_ERROR',
                },
            },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/companies/[id]/approve
 * Approve a company (Admin only)
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'admin') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Admin access required',
                        code: 'FORBIDDEN',
                    },
                },
                { status: 403 }
            );
        }

        await connectDB();

        const company = await User.findById(params.id);

        if (!company || company.role !== 'company') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Company not found',
                        code: 'NOT_FOUND',
                    },
                },
                { status: 404 }
            );
        }

        if (company.isApproved) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Company is already approved',
                        code: 'ALREADY_APPROVED',
                    },
                },
                { status: 400 }
            );
        }

        // Approve company
        company.isApproved = true;
        await company.save();

        // Send notification to company
        await Notification.create({
            userId: company._id,
            type: NotificationType.COMPANY_APPROVED,
            title: 'Company Approved!',
            message: 'Your company account has been approved. You can now post jobs.',
            link: '/company/jobs/new',
        });

        return NextResponse.json({
            success: true,
            data: {
                company: company.toJSON(),
                message: 'Company approved successfully',
            },
        });
    } catch (error: any) {
        console.error('Approve company error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to approve company',
                    code: 'APPROVAL_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
