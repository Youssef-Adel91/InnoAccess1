import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import User, { UserRole } from '@/models/User';
import { hashPassword, validatePassword, validateEmail } from '@/lib/auth-utils';

/**
 * Registration Request Schema
 */
const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address'), // Allow all email domains
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum([UserRole.USER, UserRole.COMPANY, UserRole.TRAINER]).default(UserRole.USER),
    companyName: z.string().min(2).optional(),
    companyBio: z.string().min(50, 'Company description must be at least 50 characters').optional(),
    socialMedia: z.object({
        facebook: z.string().url().optional().or(z.literal('')),
        linkedin: z.string().url().optional().or(z.literal('')),
        twitter: z.string().url().optional().or(z.literal('')),
        instagram: z.string().url().optional().or(z.literal('')),
    }).optional(),
});

/**
 * POST /api/auth/register
 * Register a new user
 */
export async function POST(request: NextRequest) {
    try {
        // Rate limiting: 3 attempts per hour per IP
        const { getClientIP, createRateLimitKey, checkRateLimit, RateLimits } = await import('@/lib/rate-limit');
        const clientIP = getClientIP(request);
        const rateLimitKey = createRateLimitKey(clientIP, 'register');
        const rateLimit = await checkRateLimit(rateLimitKey, RateLimits.REGISTER.max, RateLimits.REGISTER.window);

        if (!rateLimit.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: `Too many registration attempts. Please try again in ${rateLimit.retryAfter} seconds.`,
                        code: 'RATE_LIMIT_EXCEEDED',
                    },
                },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(rateLimit.retryAfter),
                    },
                }
            );
        }

        // Parse request body
        const body = await request.json();

        // Validate request data
        const validationResult = registerSchema.safeParse(body);

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

        const { name, email, password, role, companyName, companyBio, socialMedia } = validationResult.data;

        // Verify Turnstile token (CAPTCHA) if configured
        if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
            const turnstileToken = body.turnstileToken;
            const { verifyTurnstileToken } = await import('@/lib/turnstile');
            const verification = await verifyTurnstileToken(turnstileToken, clientIP);

            if (!verification.success) {
                return NextResponse.json(
                    {
                        success: false,
                        error: {
                            message: verification.error || 'CAPTCHA verification failed',
                            code: 'CAPTCHA_VERIFICATION_FAILED',
                        },
                    },
                    { status: 400 }
                );
            }
        }

        // Additional validation for company role
        if (role === UserRole.COMPANY) {
            if (!companyName || companyName.trim().length < 2) {
                return NextResponse.json(
                    {
                        success: false,
                        error: {
                            message: 'Company name is required for company accounts',
                            code: 'VALIDATION_ERROR',
                        },
                    },
                    { status: 400 }
                );
            }
            if (!companyBio || companyBio.trim().length < 50) {
                return NextResponse.json(
                    {
                        success: false,
                        error: {
                            message: 'Company description is required (minimum 50 characters)',
                            code: 'VALIDATION_ERROR',
                        },
                    },
                    { status: 400 }
                );
            }
        }

        // Additional email validation (removed generic domain restriction)
        if (!validateEmail(email)) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Invalid email format',
                        code: 'INVALID_EMAIL',
                    },
                },
                { status: 400 }
            );
        }

        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: passwordValidation.error,
                        code: 'WEAK_PASSWORD',
                    },
                },
                { status: 400 }
            );
        }

        // Connect to database
        await connectDB();

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });

        if (existingUser) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'An account with this email already exists',
                        code: 'EMAIL_EXISTS',
                    },
                },
                { status: 409 }
            );
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create new user with profile data for companies
        const userData: any = {
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            role,
        };

        // Add company profile data if role is company
        if (role === UserRole.COMPANY) {
            userData.profile = {
                companyName: companyName?.trim(),
                companyBio: companyBio?.trim(),
                facebook: socialMedia?.facebook || undefined,
                linkedin: socialMedia?.linkedin || undefined,
                twitter: socialMedia?.twitter || undefined,
                instagram: socialMedia?.instagram || undefined,
            };
        }

        const user = await User.create(userData);

        // Generate OTP for email verification
        const { generateOTP, hashOTP } = await import('@/lib/otp');
        const { sendVerificationEmail } = await import('@/lib/mail');

        const otp = generateOTP();
        const hashedOTP = hashOTP(otp);

        // Update user with verification token
        user.verificationToken = hashedOTP;
        user.verificationTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        await user.save();

        // Send verification email (non-blocking)
        sendVerificationEmail({
            recipientEmail: user.email,
            recipientName: user.name,
            otp,
        }).catch(error => {
            console.error('Failed to send verification email:', error);
        });

        // Return success response
        return NextResponse.json(
            {
                success: true,
                data: {
                    email: user.email,
                    message:
                        role === UserRole.COMPANY
                            ? 'Registration successful! Please check your email to verify your account. After verification, your company account will be pending admin approval.'
                            : 'Registration successful! Please check your email to verify your account before signing in.',
                },
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Registration error:', error);

        return NextResponse.json(
            {
                success: false,
                error: {
                    message: error.message || 'Registration failed. Please try again.',
                    code: 'REGISTRATION_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
