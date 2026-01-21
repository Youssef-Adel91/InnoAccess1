import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * POST /api/auth/reset-password
 * Reset password using token from email
 */
export async function POST(request: NextRequest) {
    try {
        const { token, password } = await request.json();

        if (!token || !password) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Token and password are required',
                        code: 'VALIDATION_ERROR',
                    },
                },
                { status: 400 }
            );
        }

        // Validate password strength
        if (password.length < 8) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Password must be at least 8 characters',
                        code: 'VALIDATION_ERROR',
                    },
                },
                { status: 400 }
            );
        }

        await connectDB();

        // Hash the token to compare with stored hash
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Find user with valid token and not expired
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: new Date() }, // Token not expired
        }).select('+password +resetPasswordToken +resetPasswordExpires');

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Invalid or expired reset token',
                        code: 'INVALID_TOKEN',
                    },
                },
                { status: 400 }
            );
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update password and clear reset fields
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        console.log(`✅ Password reset successful for: ${user.email}`);

        return NextResponse.json({
            success: true,
            message: 'Password reset successful. You can now sign in with your new password.',
        });
    } catch (error: any) {
        console.error('Reset password error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to reset password',
                    code: 'SERVER_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
