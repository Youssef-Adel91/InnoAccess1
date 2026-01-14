import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { authOptions } from '@/lib/auth';

/**
 * Profile Update Schema
 */
const profileUpdateSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    phone: z.string().max(20).optional(),
    location: z.string().max(100).optional(),
    bio: z.string().max(500).optional(),
    website: z.string().url().optional().or(z.literal('')),
});

/**
 * GET /api/user/profile
 * Get current user's profile
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

        const user = await User.findById(session.user.id)
            .select('-password')
            .lean();

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
            data: { user },
        });
    } catch (error: any) {
        console.error('Get profile error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to fetch profile',
                    code: 'FETCH_ERROR',
                },
            },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/user/profile
 * Update current user's profile
 */
export async function PATCH(request: NextRequest) {
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
        const validationResult = profileUpdateSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: validationResult.error.errors[0].message,
                        code: 'VALIDATION_ERROR',
                    },
                },
                { status: 400 }
            );
        }

        await connectDB();

        // Build update object
        const updateData: any = {};
        if (validationResult.data.name) updateData.name = validationResult.data.name;
        if (validationResult.data.phone !== undefined) updateData['profile.phone'] = validationResult.data.phone;
        if (validationResult.data.location !== undefined) updateData['profile.location'] = validationResult.data.location;
        if (validationResult.data.bio !== undefined) updateData['profile.bio'] = validationResult.data.bio;
        if (validationResult.data.website !== undefined) updateData['profile.website'] = validationResult.data.website;

        const user = await User.findByIdAndUpdate(
            session.user.id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password');

        return NextResponse.json({
            success: true,
            data: {
                user,
                message: 'Profile updated successfully',
            },
        });
    } catch (error: any) {
        console.error('Update profile error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: error.message || 'Failed to update profile',
                    code: 'UPDATE_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
