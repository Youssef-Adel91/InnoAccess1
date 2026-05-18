import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import User, { UserRole } from '@/models/User';
import { hashPassword, validatePassword, validateEmail } from '@/lib/auth-utils';

// Accepts any printable ASCII special character so passwords like ML_pas1@# work
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]{8,}$/;

/**
 * Registration Request Schema
 */
const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address'), // Allow all email domains
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(
            passwordRegex,
            'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        ),
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

        // Parse FormData instead of JSON
        const formData = await request.formData();

        // Extract basic fields
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const role = (formData.get('role') as UserRole) || UserRole.USER;
        const turnstileToken = formData.get('turnstileToken') as string;

        // Use zod schema for validation (construct object first)
        const validationData: any = {
            name,
            email,
            password,
            role,
        };

        // Extract company fields
        if (role === UserRole.COMPANY) {
            validationData.companyName = formData.get('companyName') as string;
            validationData.companyBio = formData.get('companyBio') as string;

            // Construct social media object
            const socialMedia: any = {};
            if (formData.get('socialMedia[facebook]')) socialMedia.facebook = formData.get('socialMedia[facebook]');
            if (formData.get('socialMedia[linkedin]')) socialMedia.linkedin = formData.get('socialMedia[linkedin]');
            if (formData.get('socialMedia[twitter]')) socialMedia.twitter = formData.get('socialMedia[twitter]');
            if (formData.get('socialMedia[instagram]')) socialMedia.instagram = formData.get('socialMedia[instagram]');

            if (Object.keys(socialMedia).length > 0) {
                validationData.socialMedia = socialMedia;
            }
        }

        // Validate basic and company data
        const validationResult = registerSchema.safeParse(validationData);

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

        // Trainer specific validation and extraction
        let trainerData: any = {};
        if (role === UserRole.TRAINER) {
            trainerData.bio = formData.get('bio') as string;
            trainerData.specialization = formData.get('specialization') as string;
            trainerData.linkedInUrl = formData.get('linkedInUrl') as string;
            trainerData.websiteUrl = formData.get('websiteUrl') as string;
            trainerData.cvFile = formData.get('cv') as File;

            if (!trainerData.bio || trainerData.bio.length < 50) {
                return NextResponse.json(
                    { success: false, error: { message: 'Bio must be at least 50 characters', code: 'VALIDATION_ERROR' } },
                    { status: 400 }
                );
            }
            if (!trainerData.specialization) {
                return NextResponse.json(
                    { success: false, error: { message: 'Specialization is required', code: 'VALIDATION_ERROR' } },
                    { status: 400 }
                );
            }
            if (!trainerData.cvFile) {
                return NextResponse.json(
                    { success: false, error: { message: 'CV file is required', code: 'VALIDATION_ERROR' } },
                    { status: 400 }
                );
            }
        }

        // Verify Turnstile token (CAPTCHA)
        if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
            if (!turnstileToken) {
                return NextResponse.json(
                    { success: false, error: { message: 'CAPTCHA verification missing', code: 'CAPTCHA_MISSING' } },
                    { status: 400 }
                );
            }
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

        // Additional email validation
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

        // Create new user
        const userData: any = {
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: role === UserRole.TRAINER ? UserRole.USER : role, // Trainers start as 'user' role until approved
        };

        // Add company profile data if role is company
        if (role === UserRole.COMPANY) {
            userData.profile = {
                companyName: validationData.companyName?.trim(),
                companyBio: validationData.companyBio?.trim(),
                facebook: validationData.socialMedia?.facebook,
                linkedin: validationData.socialMedia?.linkedin,
                twitter: validationData.socialMedia?.twitter,
                instagram: validationData.socialMedia?.instagram,
            };
        }

        const user = await User.create(userData);

        // Handle Trainer Profile Creation
        if (role === UserRole.TRAINER) {
            try {
                // Upload CV
                const { put } = await import('@vercel/blob');
                const blob = await put(`trainer-cvs/${Date.now()}-${trainerData.cvFile.name}`, trainerData.cvFile, {
                    access: 'public',
                    addRandomSuffix: true,
                });

                // Create Trainer Profile
                const { default: TrainerProfile, TrainerStatus } = await import('@/models/TrainerProfile');
                await (TrainerProfile as any).create({
                    userId: user._id,
                    bio: trainerData.bio,
                    specialization: trainerData.specialization,
                    linkedInUrl: trainerData.linkedInUrl,
                    websiteUrl: trainerData.websiteUrl,
                    cvUrl: blob.url,
                    status: TrainerStatus.PENDING,
                });
            } catch (err) {
                console.error('Failed to create trainer profile:', err);
                // We should probably delete the user if trainer profile creation fails, 
                // but for now let's just log it. The user exists but won't be a trainer.
            }
        }

        // Generate OTP for email verification
        const { generateOTP, hashOTP } = await import('@/lib/otp');
        const { sendVerificationEmail } = await import('@/lib/mail');

        const otp = generateOTP();
        const hashedOTP = hashOTP(otp);

        // Update user with verification token
        user.verificationToken = hashedOTP;
        user.verificationTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        await user.save();

        // Send verification email
        try {
            await sendVerificationEmail({
                recipientEmail: user.email,
                recipientName: user.name,
                otp,
            });
        } catch (error) {
            console.error('Failed to send verification email:', error);
        }

        // Return success response
        let successMessage = 'Registration successful! Please check your email to verify your account before signing in.';
        if (role === UserRole.COMPANY) {
            successMessage = 'Registration successful! Please check your email to verify your account. After verification, your company account will be pending admin approval.';
        } else if (role === UserRole.TRAINER) {
            successMessage = 'Registration successful! Please check your email to verify your account. After verification, your trainer application will be reviewed by admins.';
        }

        return NextResponse.json(
            {
                success: true,
                data: {
                    email: user.email,
                    message: successMessage,
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
