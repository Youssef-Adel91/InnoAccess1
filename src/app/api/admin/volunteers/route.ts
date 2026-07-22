import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import User, { UserRole } from '@/models/User';

/**
 * GET /api/admin/volunteers
 *
 * Admin-only endpoint. Returns all users with role "volunteer",
 * sorted by newest registration first.
 *
 * Query params:
 *   page   – page number (default 1)
 *   limit  – page size (default 50, max 200)
 *   search – optional partial name or email search (case-insensitive)
 *
 * Safe fields returned (sensitive fields are excluded):
 *   _id, name, email, isActive, isVerified, affiliateCode,
 *   affiliateCodeGeneratedAt, createdAt, updatedAt
 */
export async function GET(request: NextRequest) {
    try {
        // ── Auth guard: admins only ──────────────────────────────────────────────
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== UserRole.ADMIN) {
            return NextResponse.json(
                { success: false, error: { message: 'Forbidden', code: 'FORBIDDEN' } },
                { status: 403 }
            );
        }

        // ── Query params ─────────────────────────────────────────────────────────
        const { searchParams } = new URL(request.url);
        const page   = Math.max(1, parseInt(searchParams.get('page')  || '1',  10));
        const limit  = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
        const search = searchParams.get('search')?.trim();

        // ── Build query ──────────────────────────────────────────────────────────
        const query: Record<string, unknown> = {
            role: UserRole.VOLUNTEER,
        };

        if (search) {
            // Case-insensitive partial match on name OR email
            query.$or = [
                { name:  { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;

        // ── Database ─────────────────────────────────────────────────────────────
        await connectDB();

        console.log(`[Admin Volunteers] Fetching volunteers — page: ${page}, limit: ${limit}, search: "${search ?? ''}"`);

        const [volunteers, total] = await Promise.all([
            User.find(query)
                // Exclude every sensitive / internal field
                .select(
                    '-password ' +
                    '-verificationToken ' +
                    '-verificationTokenExpiry ' +
                    '-resetPasswordToken ' +
                    '-resetPasswordExpires ' +
                    '-authProvider ' +
                    '-accessibilitySettings ' +
                    '-needsOnboarding ' +
                    '-profile'
                )
                .sort({ createdAt: -1 }) // newest first
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(query),
        ]);

        return NextResponse.json({
            success: true,
            data: {
                volunteers,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNextPage: page * limit < total,
                    hasPrevPage: page > 1,
                },
            },
        });
    } catch (error: any) {
        console.error('[Admin Volunteers API] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: error.message || 'Internal server error',
                    code: 'SERVER_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
