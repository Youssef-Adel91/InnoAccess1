import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { UserRole } from '@/models/User';

const ALLOWED_ROLES: UserRole[] = [
    UserRole.USER,
    UserRole.TRAINER,
    UserRole.COMPANY,
    UserRole.VOLUNTEER,
];

/**
 * PUT /api/users/onboarding
 * Complete onboarding for a new Google OAuth user (save role, clear needsOnboarding flag).
 */
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { role, phone } = body;

        // Validate role
        if (!role || !ALLOWED_ROLES.includes(role as UserRole)) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: `Invalid role. Must be one of: ${ALLOWED_ROLES.join(', ')}`,
                        code: 'INVALID_ROLE',
                    },
                },
                { status: 400 }
            );
        }

        await connectDB();

        const updatePayload: Record<string, any> = {
            role,
            needsOnboarding: false,
        };

        if (phone) {
            updatePayload['profile.phone'] = phone;
        }

        // For trainer role: mark as pending (they still need to submit a full application)
        if (role === UserRole.TRAINER) {
            updatePayload.role = UserRole.USER; // Stays user until application approved
            updatePayload.pendingTrainerApplication = true;
        }

        // For company role: auto-set isApproved to false
        if (role === UserRole.COMPANY) {
            updatePayload.isApproved = false;
        }

        const updatedUser = await User.findByIdAndUpdate(
            session.user.id,
            { $set: updatePayload },
            { new: true }
        );

        if (!updatedUser) {
            return NextResponse.json(
                { success: false, error: { message: 'User not found', code: 'NOT_FOUND' } },
                { status: 404 }
            );
        }

        console.log(`✅ Onboarding complete for user: ${updatedUser.email} → role: ${role}`);

        return NextResponse.json({
            success: true,
            data: {
                message: 'Onboarding complete!',
                role: updatedUser.role,
                redirectTo: role === UserRole.TRAINER ? '/join-trainer' : '/dashboard',
            },
        });
    } catch (error: any) {
        console.error('Onboarding API error:', error);
        return NextResponse.json(
            { success: false, error: { message: error.message || 'Onboarding failed', code: 'SERVER_ERROR' } },
            { status: 500 }
        );
    }
}
