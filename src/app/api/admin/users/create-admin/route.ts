import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import User, { UserRole } from '@/models/User';
import { hashPassword } from '@/lib/auth-utils';
import { authOptions } from '@/lib/auth';

/**
 * Create Admin Schema
 */
const createAdminSchema = z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(8),
});

/**
 * POST /api/admin/users/create-admin
 * Create a new admin user (Admin only)
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // Only admins can create other admins
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Admin access required',
                        code: 'FORBIDDEN',
                    },
                },
                { status: 403 }
            );
        }

        const body = await request.json();
        const validationResult = createAdminSchema.safeParse(body);

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

        const { name, email, password } = validationResult.data;

        await connectDB();

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });

        if (existingUser) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'A user with this email already exists',
                        code: 'EMAIL_EXISTS',
                    },
                },
                { status: 409 }
            );
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create admin user
        const admin = await User.create({
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: UserRole.ADMIN,
            isApproved: true,
            isActive: true,
        });

        return NextResponse.json(
            {
                success: true,
                data: {
                    admin: admin.toJSON(),
                    message: 'Admin user created successfully!',
                },
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Create admin error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: error.message || 'Failed to create admin',
                    code: 'CREATE_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
