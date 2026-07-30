import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db';
import User, { UserRole } from '@/models/User';

/**
 * GET /api/admin/users
 *
 * Admin-only endpoint to list and search users.
 *
 * FIX: Ghost-Email Visibility
 * By default (no search), only active users are returned.
 * When `email` is provided as a query param, the query also includes
 * inactive (isActive: false) accounts, surfacing "ghost" records that
 * would block new registrations but are invisible in normal queries.
 *
 * Query params:
 *   email   – exact email search (sanitized: trim + lowercase)
 *   role    – filter by role
 *   page    – page number (default 1)
 *   limit   – page size (default 50, max 200)
 */
export async function GET(request: NextRequest) {
    try {
        // Auth guard: admins only
        const user = await currentUser();
        const userRole = (user?.publicMetadata?.role || user?.unsafeMetadata?.role) as string | undefined;
        if (!user || userRole !== 'admin') {
            return NextResponse.json(
                { success: false, error: { message: 'Forbidden', code: 'FORBIDDEN' } },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const emailRaw = searchParams.get('email');
        const role     = searchParams.get('role');
        const page     = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const limit    = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

        await connectDB();

        // Build the Mongoose query
        const query: Record<string, unknown> = {};

        if (emailRaw) {
            // FIX: Sanitize the search email exactly as registration does so the
            // search correctly finds accounts stored in their canonical form.
            const email = emailRaw.trim().toLowerCase();

            // Exact-email search: include ALL users with this email regardless of
            // isActive status.  This surfaces ghost/soft-deleted accounts that
            // would otherwise be invisible to the admin.
            query.email = email;
            // ↑ deliberately NOT adding { isActive: true } here so inactive
            //   (ghost) records are returned and shown with a badge.
        } else {
            // Default list: only active users (inactive ones are in the "ghost" category)
            query.isActive = true;
        }

        if (role && Object.values(UserRole).includes(role as UserRole)) {
            query.role = role;
        }

        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            User.find(query)
                .select('-password -verificationToken -resetPasswordToken -verificationTokenExpiry -resetPasswordExpires')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(query),
        ]);

        // Annotate each user with a `isGhost` flag so the admin UI can render
        // a "Deleted / Inactive Account" badge clearly.
        const annotatedUsers = users.map((u) => ({
            ...u,
            isGhost: !u.isActive,
        }));

        return NextResponse.json({
            success: true,
            data: {
                users: annotatedUsers,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
        });
    } catch (error: any) {
        console.error('[Admin Users API] Error:', error);
        return NextResponse.json(
            { success: false, error: { message: error.message || 'Internal server error', code: 'SERVER_ERROR' } },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/admin/users
 *
 * Admin action: reactivate a ghost account by email.
 * Body: { email: string }
 */
export async function PATCH(request: NextRequest) {
    try {
        const authUser = await currentUser();
        const userRole = (authUser?.publicMetadata?.role || authUser?.unsafeMetadata?.role) as string | undefined;
        if (!authUser || userRole !== 'admin') {
            return NextResponse.json(
                { success: false, error: { message: 'Forbidden', code: 'FORBIDDEN' } },
                { status: 403 }
            );
        }

        const body = await request.json();
        const email = (body.email as string)?.trim().toLowerCase();

        if (!email) {
            return NextResponse.json(
                { success: false, error: { message: 'email is required', code: 'VALIDATION_ERROR' } },
                { status: 400 }
            );
        }

        await connectDB();

        const dbUser = await User.findOne({ email });
        if (!dbUser) {
            return NextResponse.json(
                { success: false, error: { message: 'No account found with this email', code: 'NOT_FOUND' } },
                { status: 404 }
            );
        }

        if (dbUser.isActive) {
            return NextResponse.json(
                { success: false, error: { message: 'Account is already active', code: 'ALREADY_ACTIVE' } },
                { status: 409 }
            );
        }

        dbUser.isActive = true;
        await dbUser.save();

        console.log(`[Admin] Reactivated ghost account for: ${email} by admin ${authUser.emailAddresses?.[0]?.emailAddress}`);

        return NextResponse.json({
            success: true,
            data: { message: `Account ${email} has been reactivated.` },
        });
    } catch (error: any) {
        console.error('[Admin Users PATCH] Error:', error);
        return NextResponse.json(
            { success: false, error: { message: error.message || 'Internal server error', code: 'SERVER_ERROR' } },
            { status: 500 }
        );
    }
}
