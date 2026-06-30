import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

/**
 * POST /api/admin/sync-course-status
 *
 * Idempotent one-shot migration endpoint.
 * Fixes the data-consistency gap caused by the partial migration:
 *
 *   Case A) isPublished: true  BUT status !== 'PUBLISHED'
 *           → set status = 'PUBLISHED'  (these courses disappeared from the marketplace)
 *
 *   Case B) status: 'PUBLISHED'  BUT isPublished !== true
 *           → set isPublished = true  (status is the canonical source of truth)
 *
 * Auth: Admin session only.
 * Safe to run multiple times — both updateMany calls are fully idempotent.
 */
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: { message: 'Admin access required', code: 'FORBIDDEN' } },
                { status: 403 }
            );
        }

        await connectDB();
        const db = mongoose.connection.db!;
        const courses = db.collection('courses');

        // ── Case A: isPublished=true but status is not 'PUBLISHED' ──────────────
        // These are the legacy courses invisible on the public marketplace.
        const caseAResult = await courses.updateMany(
            {
                isPublished: true,
                status: { $ne: 'PUBLISHED' },
            },
            {
                $set: { status: 'PUBLISHED' },
            }
        );

        // ── Case B: status='PUBLISHED' but isPublished is not true ───────────────
        // Defensive: keep the boolean flag in sync with the canonical enum.
        const caseBResult = await courses.updateMany(
            {
                status: 'PUBLISHED',
                isPublished: { $ne: true },
            },
            {
                $set: { isPublished: true },
            }
        );

        const totalFixed = caseAResult.modifiedCount + caseBResult.modifiedCount;

        console.log(`✅ [sync-course-status] Case A fixed: ${caseAResult.modifiedCount} | Case B fixed: ${caseBResult.modifiedCount}`);

        return NextResponse.json({
            success: true,
            data: {
                message: `Sync complete. ${totalFixed} course(s) updated.`,
                details: {
                    caseA_isPublishedTrueButStatusNotPublished: caseAResult.modifiedCount,
                    caseB_statusPublishedButIsPublishedFalse: caseBResult.modifiedCount,
                    totalFixed,
                },
            },
        });
    } catch (error: any) {
        console.error('❌ [sync-course-status] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: error.message || 'Internal server error',
                    code: 'SYNC_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
