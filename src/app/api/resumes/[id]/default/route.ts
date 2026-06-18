import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Resume from '@/models/Resume';
import { Types } from 'mongoose';
import mongoose from 'mongoose';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/resumes/[id]/default
 *
 * A dedicated endpoint to set this resume as the user's default.
 * This mirrors the isDefault logic inside PATCH /api/resumes/[id] but is
 * provided as a standalone endpoint so the "My Resumes" list UI can set a
 * default without first loading the full resume document into the Zustand store.
 *
 * ── Transaction ───────────────────────────────────────────────────────────────
 * 1. Unset isDefault on all OTHER resumes for this user (updateMany)
 * 2. Set isDefault=true on THIS resume (findOneAndUpdate)
 *
 * Both writes are wrapped in a Mongoose session transaction — if step 2 fails,
 * step 1 is rolled back so no user ends up with zero default resumes.
 *
 * Auth: Owner only.
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json(
                { success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
                { status: 401 }
            );
        }

        await connectDB();

        const { id } = await params;
        const userId  = new Types.ObjectId(session.user.id);

        if (!Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, error: { message: 'Invalid resume ID', code: 'INVALID_ID' } },
                { status: 400 }
            );
        }

        // Verify the resume exists and belongs to the requesting user
        const exists = await Resume.exists({ _id: id, userId });
        if (!exists) {
            return NextResponse.json(
                { success: false, error: { message: 'Resume not found', code: 'NOT_FOUND' } },
                { status: 404 }
            );
        }

        // ── Atomic two-step default flip ──────────────────────────────────────
        const dbSession = await mongoose.startSession();

        try {
            dbSession.startTransaction();

            // Step 1: Remove isDefault from all OTHER resumes for this user
            await Resume.updateMany(
                { userId, _id: { $ne: new Types.ObjectId(id) } },
                { $set: { isDefault: false } },
                { session: dbSession }
            );

            // Step 2: Set isDefault on this resume — return a lightweight projection
            const updated = await Resume.findOneAndUpdate(
                { _id: id, userId },
                { $set: { isDefault: true } },
                {
                    new:        true,
                    session:    dbSession,
                    projection: { _id: 1, title: 1, isDefault: 1, updatedAt: 1 },
                }
            ).lean();

            await dbSession.commitTransaction();

            console.log(`✅ Resume ${id} set as default for user ${session.user.id}`);

            return NextResponse.json({
                success: true,
                data: {
                    resume:  updated,
                    message: 'Default resume updated.',
                },
            });

        } catch (txError) {
            await dbSession.abortTransaction();
            throw txError;
        } finally {
            await dbSession.endSession();
        }

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error(`❌ PATCH /api/resumes/[id]/default error:`, error);
        return NextResponse.json(
            { success: false, error: { message, code: 'SET_DEFAULT_ERROR' } },
            { status: 500 }
        );
    }
}
