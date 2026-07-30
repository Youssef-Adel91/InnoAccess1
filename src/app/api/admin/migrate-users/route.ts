import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

interface FailedMigration {
    email: string;
    reason: string;
}

/**
 * POST /api/admin/migrate-users
 *
 * One-off API route to migrate users from existing MongoDB database to Clerk.
 *
 * Query Parameter Required:
 *   ?secret=inno-migrate-2026
 */
export async function POST(request: NextRequest) {
    try {
        // 1. Security check: Validate query secret
        const { searchParams } = new URL(request.url);
        const secret = searchParams.get('secret');

        if (secret !== 'inno-migrate-2026') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Unauthorized: Missing or invalid secret parameter.',
                        code: 'UNAUTHORIZED',
                    },
                },
                { status: 401 }
            );
        }

        // 2. Connect to MongoDB database
        await connectDB();

        // 3. Fetch all users from MongoDB
        const mongoUsers = await User.find({}).lean();

        const successful: string[] = [];
        const failed: FailedMigration[] = [];

        const client = await clerkClient();

        // 4. Iteratively process users to respect Clerk API rate limits
        for (const user of mongoUsers) {
            const email = user.email?.trim().toLowerCase();
            if (!email) {
                failed.push({
                    email: 'unknown',
                    reason: `User record ID ${user._id} has no valid email address.`,
                });
                continue;
            }

            // Map NextAuth role to Clerk role (map 'user' to 'student')
            const clerkRole = user.role === 'user' ? 'student' : user.role || 'student';

            // Split name into firstName and lastName
            const nameParts = (user.name || 'User').trim().split(/\s+/);
            const firstName = nameParts[0] || 'User';
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;

            try {
                await client.users.createUser({
                    emailAddress: [email],
                    firstName,
                    lastName,
                    publicMetadata: {
                        role: clerkRole,
                    },
                    skipPasswordRequirement: true,
                });

                successful.push(email);
            } catch (error: any) {
                const errorMessage =
                    error?.errors?.[0]?.message ||
                    error?.message ||
                    String(error);

                console.warn(`[Migrate Users] Failed for ${email}: ${errorMessage}`);
                failed.push({
                    email,
                    reason: errorMessage,
                });
            }

            // 5. Small delay (200ms) between each call to avoid Clerk 429 Too Many Requests
            await new Promise((resolve) => setTimeout(resolve, 200));
        }

        // 6. Return comprehensive migration report
        return NextResponse.json({
            success: true,
            summary: {
                totalProcessed: mongoUsers.length,
                successfulMigrations: successful.length,
                failedMigrations: failed.length,
            },
            results: {
                successful,
                failed,
            },
        });
    } catch (error: any) {
        console.error('[Migrate Users] Critical Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: error?.message || 'Failed to execute user migration script.',
                    code: 'MIGRATION_ERROR',
                },
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/admin/migrate-users
 *
 * Allow running the migration via browser GET request for convenience if secret is provided.
 */
export async function GET(request: NextRequest) {
    return POST(request);
}
