import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { sendEmail, getPasswordResetEmailTemplate } from '@/lib/mail';
import crypto from 'crypto';

/**
 * POST /api/auth/forgot-password
 * Request password reset - sends email with reset link
 */
export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Email is required',
                        code: 'VALIDATION_ERROR',
                    },
                },
                { status: 400 }
            );
        }

        await connectDB();

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });

        // Always return success to avoid email enumeration
        // (don't reveal if email exists or not)
        if (!user) {
            console.log(`Password reset requested for non-existent email: ${email}`);
            return NextResponse.json({
                success: true,
                message: 'If that email exists, a reset link has been sent.',
            });
        }

        // Generate secure random token
        const resetToken = crypto.randomBytes(32).toString('hex');

        // Hash token before storing (security best practice)
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        // Save token and expiry to user (1 hour from now)
        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
        await user.save();

        // Create reset link
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const resetLink = `${baseUrl}/auth/reset-password?token=${resetToken}`;

        // Send email
        const emailHtml = getPasswordResetEmailTemplate(user.name, resetLink);
        const emailSent = await sendEmail({
            to: user.email,
            subject: '🔐 Reset Your Password - InnoAccess',
            html: emailHtml,
        });

        if (!emailSent) {
            console.error('Failed to send password reset email to:', user.email);
            // Still return success to avoid revealing if email exists
        }

        console.log(`✅ Password reset email sent to: ${user.email}`);

        return NextResponse.json({
            success: true,
            message: 'If that email exists, a reset link has been sent.',
        });
    } catch (error: any) {
        console.error('Forgot password error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to process request',
                    code: 'SERVER_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
