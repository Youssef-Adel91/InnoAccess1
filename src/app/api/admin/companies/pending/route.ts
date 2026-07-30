import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db';
import User, { UserRole } from '@/models/User';

/**
 * GET /api/admin/companies/pending
 * Get all pending company approvals (Admin only)
 */
export async function GET(request: NextRequest) {
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
