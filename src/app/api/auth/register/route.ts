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
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum([UserRole.USER, UserRole.COMPANY, UserRole.TRAINER]).default(UserRole.USER),
});

/**
 * POST /api/auth/register
 * Register a new user
 */
export async function POST(request: NextRequest) {
    try {
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

        const { name, email, password, role } = validationResult.data;

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
        const user = await User.create({
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            role,
        });

        // Return success response (password is automatically excluded by toJSON)
        return NextResponse.json(
            {
                success: true,
                data: {
                    user: user.toJSON(),
                    message:
                        role === UserRole.COMPANY
                            ? 'Registration successful! Your company account is pending admin approval.'
                            : 'Registration successful! You can now sign in.',
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
