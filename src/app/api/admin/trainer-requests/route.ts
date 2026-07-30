import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db';
import TrainerProfile from '@/models/TrainerProfile';
import User from '@/models/User';

/**
 * GET /api/admin/trainer-requests
 * Fetch all pending trainer applications for admin review
 */
export async function GET() {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json(
                { success: false, error: { message: 'Unauthorized - authentication required', code: 'UNAUTHORIZED' } },
                { status: 401 }
            );
        }

        let userRole = (user.publicMetadata?.role || user.unsafeMetadata?.role) as string | undefined;

        await connectDB();

        if (userRole !== 'admin') {
            const dbUser = await User.findOne({
                $or: [
                    { clerkId: user.id },
                    { email: user.emailAddresses[0]?.emailAddress?.toLowerCase() }
                ]
            }).lean();
            if (dbUser?.role === 'admin') {
                userRole = 'admin';
            }
        }

        if (userRole !== 'admin') {
            return NextResponse.json(
                { success: false, error: { message: 'Unauthorized - admin access required', code: 'UNAUTHORIZED' } },
                { status: 403 }
            );
        }

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
