import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/db';
import User, { UserRole } from '@/models/User';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/admin/companies/pending
 * Get all pending company approvals (Admin only)
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // Check if user is admin
        if (!session || session.user.role !== 'admin') {
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

        // Find all company accounts that are not approved
        const pendingCompanies = await User.find({
            role: UserRole.COMPANY,
            isApproved: false,
        })
            .select('name email profile createdAt')
            .sort({ createdAt: -1 })
            .lean();

        // Note: profile includes companyName, companyBio, facebook, linkedin, twitter, instagram
        return NextResponse.json({
            success: true,
            data: {
                companies: pendingCompanies,
                count: pendingCompanies.length,
            },
        });
    } catch (error: any) {
        console.error('Fetch pending companies error:', error);
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
