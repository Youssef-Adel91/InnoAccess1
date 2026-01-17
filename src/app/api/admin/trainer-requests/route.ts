import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import TrainerProfile from '@/models/TrainerProfile';
import User from '@/models/User';

/**
 * GET /api/admin/trainer-requests
 * Fetch all pending trainer applications for admin review
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'admin') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Unauthorized - admin access required',
                        code: 'UNAUTHORIZED',
                    },
                },
                { status: 401 }
            );
        }

        await connectDB();

        // Fetch all pending trainer profiles with user data
        const pendingProfiles = await TrainerProfile.find({
            status: 'pending',
        })
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .lean();

        console.log(`✅ Found ${pendingProfiles.length} pending trainer applications`);

        return NextResponse.json({
            success: true,
            data: {
                applications: pendingProfiles,
                count: pendingProfiles.length,
            },
        });
    } catch (error: any) {
        console.error('❌ Fetch trainer requests error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to fetch trainer applications',
                    code: 'SERVER_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
