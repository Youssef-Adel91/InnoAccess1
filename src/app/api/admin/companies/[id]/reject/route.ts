import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

/**
 * POST /api/admin/companies/[id]/reject
 * Reject a company account (Admin only)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await currentUser();
        const userRole = (user?.publicMetadata?.role || user?.unsafeMetadata?.role) as string | undefined;

        // Check if user is admin
        if (!user || userRole !== 'admin') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Unauthorized - Admin access required',
                        code: 'UNAUTHORIZED',
                    },
                },
                { status: 401 }
            );
        }

        await connectDB();

        const { id } = await params;

        // Find the company account
        const company = await User.findById(id);

        if (!company) {
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

        if (company.role !== 'company') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'User is not a company account',
                        code: 'INVALID_ROLE',
                    },
                },
                { status: 400 }
            );
        }

        // Delete the company account (rejection = deletion)
        await User.findByIdAndDelete(id);

        return NextResponse.json({
            success: true,
            data: {
                message: 'Company account rejected and removed successfully',
            },
        });
    } catch (error: any) {
        console.error('Company rejection error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to reject company',
                    code: 'REJECTION_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
