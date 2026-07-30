import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db';
import Course from '@/models/Course';

/**
 * GET /api/admin/pending-courses-count
 *
 * Returns the count of courses currently awaiting admin approval.
 * Lightweight endpoint used for the dashboard badge — no pagination or
 * expensive joins; just a single countDocuments call.
 *
 * Auth: Admin only.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const user = await currentUser();
        const userRole = (user?.publicMetadata?.role || user?.unsafeMetadata?.role) as string | undefined;

        if (!user || userRole !== 'admin') {
            return NextResponse.json(
                { success: false, error: { message: 'Admin access required', code: 'FORBIDDEN' } },
                { status: 403 }
            );
        }

        await connectDB();

        const count = await Course.countDocuments({ status: 'PENDING_APPROVAL' });

        return NextResponse.json({ success: true, data: { count } });
    } catch (error: any) {
        console.error('❌ [pending-courses-count] Error:', error);
        return NextResponse.json(
            { success: false, error: { message: error.message || 'Internal server error', code: 'FETCH_ERROR' } },
            { status: 500 }
        );
    }
}
