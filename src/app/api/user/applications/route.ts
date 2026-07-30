import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db';
import Application from '@/models/Application';
import Job from '@/models/Job'; // Import Job model for populate
import User from '@/models/User'; // Import User model for nested populate (companyId)

// Force models to be registered in Mongoose
Job; User;

/**
 * GET /api/user/applications
 * Get all job applications for the authenticated user via Clerk
 */
export async function GET(request: NextRequest) {
    try {
        console.log('📋 GET /api/user/applications - Start');
        const clerkUser = await currentUser();

        if (!clerkUser) {
            console.log('❌ Unauthorized - no clerk user');
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

        const email = clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase().trim();
        await connectDB();

        const mongoUser = await User.findOne({ email });
        if (!mongoUser) {
            return NextResponse.json({
                success: true,
                data: {
                    applications: [],
                    count: 0,
                },
            });
        }

        const { searchParams } = new URL(request.url);
        const statusFilter = searchParams.get('status');

        // Build query using MongoDB user ID
        const query: any = { userId: mongoUser._id };

        if (statusFilter && statusFilter !== 'all') {
            query.status = statusFilter;
        }

        console.log('🔍 Query:', JSON.stringify(query));

        // Get applications with job details
        const applications = await Application.find(query)
            .populate({
                path: 'jobId',
                select: 'title location type companyId',
                populate: {
                    path: 'companyId',
                    select: 'name profile',
                },
            })
            .sort({ appliedAt: -1 })
            .lean();

        console.log('✅ Found applications:', applications.length);

        return NextResponse.json({
            success: true,
            data: {
                applications,
                count: applications.length,
            },
        });
    } catch (error: any) {
        console.error('❌ Fetch applications error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to fetch applications',
                    code: 'SERVER_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
