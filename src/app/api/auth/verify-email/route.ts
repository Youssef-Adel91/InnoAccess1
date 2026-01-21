import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { verifyOTP, isOTPExpired } from '@/lib/otp';
import { sendWelcomeEmail } from '@/lib/mail';

/**
 * Verification Request Schema
 */
const verificationSchema = z.object({
    email: z.string().email('Invalid email address'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
});

/**
 * POST /api/auth/verify-email
 * Verify email using OTP
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // SECURITY: Sanitize input to prevent NoSQL injection
        const { sanitizeInput } = await import('@/lib/sanitize');
        const sanitizedBody = sanitizeInput(body);

        // Validate request data
        const validationResult = verificationSchema.safeParse(sanitizedBody);

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

        const { email, otp } = validationResult.data;

        await connectDB();

        // Find user with verification token selected
        const user = await User.findOne({ email: email.toLowerCase() })
            .select('+verificationToken +verificationTokenExpiry');

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'User not found',
                        code: 'USER_NOT_FOUND',
                    },
                },
                { status: 404 }
            );
        }

        // Check if already verified
        if (user.isVerified) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Email already verified',
                        code: 'ALREADY_VERIFIED',
                    },
                },
                { status: 400 }
            );
        }

        // Check if verification token exists
        if (!user.verificationToken || !user.verificationTokenExpiry) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'No verification code found. Please request a new one.',
                        code: 'NO_VERIFICATION_CODE',
                    },
                },
                { status: 400 }
            );
        }

        // Check if OTP has expired
        if (isOTPExpired(user.verificationTokenExpiry)) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Verification code has expired. Please request a new one.',
                        code: 'OTP_EXPIRED',
                    },
                },
                { status: 400 }
            );
        }

        // Verify OTP
        if (!verifyOTP(otp, user.verificationToken)) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Invalid verification code',
                        code: 'INVALID_OTP',
                    },
                },
                { status: 400 }
            );
        }

        // Mark user as verified and clear verification token
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpiry = undefined;
        await user.save();

        // Send welcome email (non-blocking)
        sendWelcomeEmail({
            recipientEmail: user.email,
            recipientName: user.name,
        }).catch(error => {
            console.error('Failed to send welcome email:', error);
        });

        return NextResponse.json(
            {
                success: true,
                data: {
                    message: 'Email verified successfully! You can now sign in.',
                },
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('Email verification error:', error);

        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Email verification failed. Please try again.',
                    code: 'VERIFICATION_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
