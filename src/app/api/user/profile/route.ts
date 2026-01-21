import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/user/profile
 * Get current user's full profile (including profile fields for completeness calculation)
 */
export async function GET(request: NextRequest) {
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

        // Fetch user with profile data
        const user = await User.findById(session.user.id).select('-password').lean();

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'User not found',
                        code: 'NOT_FOUND',
                    },
                },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                user,
            },
        });
    } catch (error: any) {
        console.error('Get user profile error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to fetch user profile',
                    code: 'FETCH_ERROR',
                },
            },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/user/profile
 * Update current user's profile
 */
export async function PUT(request: NextRequest) {
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

        const body = await request.json();
        const { profile, name, phone, location, bio, website, linkedin, avatar } = body;

        await connectDB();

        // Build update object - support both nested profile object and flat fields
        const updateData: any = {};

        if (profile) {
            // If profile object is provided directly
            updateData.profile = profile;
        } else {
            // If individual fields are provided
            updateData.profile = {};
            if (bio !== undefined) updateData.profile.bio = bio;
            if (phone !== undefined) updateData.profile.phone = phone;
            if (location !== undefined) updateData.profile.location = location;
            if (website !== undefined) updateData.profile.website = website;
            if (linkedin !== undefined) updateData.profile.linkedin = linkedin;
            if (avatar !== undefined) updateData.profile.avatar = avatar;
        }

        // Update name if provided (it's a top-level field, not in profile)
        if (name !== undefined) {
            updateData.name = name;
        }

        // Update user profile
        const updatedUser = await User.findByIdAndUpdate(
            session.user.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'User not found',
                        code: 'NOT_FOUND',
                    },
                },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                user: updatedUser,
                message: 'Profile updated successfully',
            },
        });
    } catch (error: any) {
        console.error('Update user profile error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to update user profile',
                    code: 'UPDATE_ERROR',
                    details: error.message,
                },
            },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/user/profile
 * Update current user's profile (alias to PUT for compatibility)
 */
export async function PATCH(request: NextRequest) {
    return PUT(request);
}
