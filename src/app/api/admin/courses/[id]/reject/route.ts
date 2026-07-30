import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { connectDB } from '@/lib/db';
import Course, { CourseStatus } from '@/models/Course';
import { Types } from 'mongoose';

/**
 * POST /api/admin/courses/[id]/reject
 *
 * Rejects a PENDING_APPROVAL course — sets status back to REJECTED
 * and stores an optional rejection reason on the document.
 *
 * Auth: Admin only.
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const token = await getToken({
            req: request as any,
            secret: process.env.NEXTAUTH_SECRET,
        });

        if (!token || token.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        if (!Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
        }

        const body = await request.json().catch(() => ({}));
        const { reason } = body;

        await connectDB();

        const course = await Course.findById(id);
        if (!course) {
            return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        }

        if (course.status !== CourseStatus.PENDING_APPROVAL) {
            return NextResponse.json(
                { error: `Course cannot be rejected from status: ${course.status}` },
                { status: 400 }
            );
        }

        // Move back to REJECTED — trainer can fix and re-submit
        course.status      = CourseStatus.REJECTED;
        course.isPublished = false;

        // Store reason if provided (useful for trainer feedback)
        if (reason && typeof reason === 'string' && reason.trim()) {
            (course as any).rejectionReason = reason.trim();
        }

        await course.save();

        return NextResponse.json({
            success: true,
            message: 'Course rejected successfully',
            courseId: course._id,
            status: course.status,
        });
    } catch (error: any) {
        console.error('❌ [course-reject] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
