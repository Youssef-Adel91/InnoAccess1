import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { generateOTP, hashOTP } from '@/lib/otp';
import { sendVerificationEmail } from '@/lib/mail';

/**
 * Resend Verification Request Schema
 */
const resendSchema = z.object({
    email: z.string().email('Invalid email address'),
});

// In-memory rate limiting (simple implementation)
const resendAttempts = new Map<string, { count: number; resetAt: number }>();

/**
 * POST /api/auth/resend-verification
 * Resend verification OTP
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate request data
        const validationResult = resendSchema.safeParse(body);

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

        const { email } = validationResult.data;

        // Rate limiting: 3 attempts per 10 minutes
        const now = Date.now();
        const key = email.toLowerCase();
        const attempts = resendAttempts.get(key);

        if (attempts) {
            if (now < attempts.resetAt) {
                if (attempts.count >= 3) {
                    const waitMinutes = Math.ceil((attempts.resetAt - now) / 60000);
                    return NextResponse.json(
                        {
                            success: false,
                            error: {
                                message: `Too many attempts. Please try again in ${waitMinutes} minute(s).`,
                                code: 'RATE_LIMIT_EXCEEDED',
                            },
                        },
                        { status: 429 }
                    );
                }
                attempts.count++;
            } else {
                // Reset window expired
                resendAttempts.set(key, { count: 1, resetAt: now + 10 * 60 * 1000 });
            }
        } else {
            // First attempt
            resendAttempts.set(key, { count: 1, resetAt: now + 10 * 60 * 1000 });
        }

        await connectDB();

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });

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

        // Generate new OTP
        const otp = generateOTP();
        const hashedOTP = hashOTP(otp);

        // Update user with new verification token
        user.verificationToken = hashedOTP;
        user.verificationTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        await user.save();

        // Send verification email
        const emailSent = await sendVerificationEmail({
            recipientEmail: user.email,
            recipientName: user.name,
            otp,
        });

        if (!emailSent) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Failed to send verification email',
                        code: 'EMAIL_SEND_FAILED',
                    },
                },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                data: {
                    message: 'Verification code sent successfully. Please check your email.',
                },
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('Resend verification error:', error);

        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to resend verification code. Please try again.',
                    code: 'RESEND_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
