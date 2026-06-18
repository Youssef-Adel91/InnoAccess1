import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Resume from '@/models/Resume';
import { Types } from 'mongoose';
import mongoose from 'mongoose';

// ─── Shared helpers ───────────────────────────────────────────────────────────

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Validates that `id` is a legal MongoDB ObjectId string and that the
 * resume belongs to the requesting user.
 * Returns the resume document or a ready-to-send error response.
 */
async function getOwnedResume(userId: Types.ObjectId, id: string) {
    if (!Types.ObjectId.isValid(id)) {
        return {
            error: NextResponse.json(
                { success: false, error: { message: 'Invalid resume ID', code: 'INVALID_ID' } },
                { status: 400 }
            ),
        };
    }

    const resume = await Resume.findOne({ _id: id, userId }).lean();

    if (!resume) {
        return {
            error: NextResponse.json(
                { success: false, error: { message: 'Resume not found', code: 'NOT_FOUND' } },
                { status: 404 }
            ),
        };
    }

    return { resume };
}

// ─── GET /api/resumes/[id] ────────────────────────────────────────────────────

/**
 * GET /api/resumes/[id]
 *
 * Fetches the FULL resume document — including all nested arrays — to hydrate
 * the Zustand store when the user opens the Resume Builder.
 *
 * ── Why .lean()? ─────────────────────────────────────────────────────────────
 * We use `.lean()` so Mongoose returns a plain JS object instead of a
 * Mongoose document. This:
 *   - Makes JSON serialisation ~3x faster (no Mongoose overhead)
 *   - Is safe here because we only read — not write — from this endpoint
 *   - Avoids accidentally shipping Mongoose internals to the client
 *
 * ── ObjectId serialisation ───────────────────────────────────────────────────
 * .lean() returns ObjectIds as instances of `Types.ObjectId`, which
 * JSON.stringify() serialises as plain hex strings automatically.
 * No manual `.toString()` needed.
 *
 * Auth: Owner only.
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
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

        const { resume, error } = await getOwnedResume(userId, id);
        if (error) return error;

        return NextResponse.json({
            success: true,
            data:    { resume },
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error(`❌ GET /api/resumes/[id] error:`, error);
        return NextResponse.json(
            { success: false, error: { message, code: 'RESUME_FETCH_ERROR' } },
            { status: 500 }
        );
    }
}

// ─── PATCH /api/resumes/[id] ──────────────────────────────────────────────────

/**
 * PATCH /api/resumes/[id]
 *
 * The auto-save endpoint — called by the Zustand `useAutoSave` hook after
 * 2 seconds of user inactivity. Also handles the `isDefault` toggle.
 *
 * ── Partial update design ────────────────────────────────────────────────────
 * The body may contain ANY subset of resume fields. We use `$set` with the
 * incoming fields rather than replacing the entire document. This means the
 * debounced auto-save can send only the fields that changed (e.g., just
 * `experiences`) without accidentally nuking unrelated fields (e.g., `skills`).
 *
 * However, because the Zustand store always holds the full draft in memory,
 * in practice the auto-save sends the full draft on every call. The partial
 * update approach is still correct because it is safe whether the payload is
 * partial or full.
 *
 * ── isDefault: two-step atomic flip ─────────────────────────────────────────
 * MongoDB cannot enforce "at most one document per user with isDefault=true"
 * via a partial unique index because unique indexes don't support partial
 * conditions in this way. We therefore enforce it manually:
 *
 *   Step 1: updateMany  → set isDefault=false on ALL other resumes for this user
 *   Step 2: findByIdAndUpdate → set isDefault=true on THIS resume
 *
 * This is wrapped in a Mongoose session (transaction) so it is atomic.
 * If step 2 fails, step 1 is rolled back — we never end up with zero defaults.
 *
 * ── Security ─────────────────────────────────────────────────────────────────
 * Fields that must NEVER be overwritten by the client are excluded from the
 * allowed update set: `userId`, `_id`, `createdAt`, `templateId`.
 * `templateId` is forced to 'classic' for Sprint 1.
 *
 * Body: Partial resume data — any combination of:
 *   title, direction, isDefault, personalInfo, summary,
 *   experiences, educations, skills, languages, certifications
 *
 * Returns: The updated resume document.
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

        // ── Verify ownership first ────────────────────────────────────────────
        const { error: ownershipError } = await getOwnedResume(userId, id);
        if (ownershipError) return ownershipError;

        // ── Parse body ────────────────────────────────────────────────────────
        let body: Record<string, unknown>;
        try {
            body = (await req.json()) as Record<string, unknown>;
        } catch {
            return NextResponse.json(
                { success: false, error: { message: 'Invalid JSON body', code: 'INVALID_BODY' } },
                { status: 400 }
            );
        }

        // ── Build the safe $set payload ───────────────────────────────────────
        // Whitelist the allowed update fields to prevent client-side injection
        // of protected fields like userId, _id, templateId.
        const ALLOWED_FIELDS = [
            'title',
            'direction',
            'personalInfo',
            'summary',
            'experiences',
            'educations',
            'skills',
            'languages',
            'certifications',
        ] as const;

        type AllowedField = (typeof ALLOWED_FIELDS)[number];

        const updatePayload: Partial<Record<AllowedField, unknown>> = {};
        for (const field of ALLOWED_FIELDS) {
            if (field in body) {
                updatePayload[field] = body[field];
            }
        }

        // Sprint 1: template is always 'classic' — never updatable by the client
        // (templateId left out of ALLOWED_FIELDS intentionally)

        const settingDefault = body.isDefault === true;

        // ── isDefault: atomic two-step flip ───────────────────────────────────
        if (settingDefault) {
            const dbSession = await mongoose.startSession();

            try {
                dbSession.startTransaction();

                // Step 1: Unset isDefault on ALL other resumes for this user
                await Resume.updateMany(
                    { userId, _id: { $ne: new Types.ObjectId(id) } },
                    { $set: { isDefault: false } },
                    { session: dbSession }
                );

                // Step 2: Apply the full update (including isDefault: true) to this resume
                const updated = await Resume.findOneAndUpdate(
                    { _id: id, userId },
                    { $set: { ...updatePayload, isDefault: true } },
                    { new: true, session: dbSession }
                ).lean();

                await dbSession.commitTransaction();

                console.log(`✅ Resume ${id} set as default for user ${session.user.id}`);

                return NextResponse.json({
                    success: true,
                    data:    { resume: updated },
                });

            } catch (txError) {
                await dbSession.abortTransaction();
                throw txError;
            } finally {
                await dbSession.endSession();
            }
        }

        // ── Normal update (no isDefault change) ───────────────────────────────
        const updated = await Resume.findOneAndUpdate(
            { _id: id, userId },
            { $set: updatePayload },
            { new: true, runValidators: true }
        ).lean();

        return NextResponse.json({
            success: true,
            data:    { resume: updated },
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error(`❌ PATCH /api/resumes/[id] error:`, error);
        return NextResponse.json(
            { success: false, error: { message, code: 'RESUME_UPDATE_ERROR' } },
            { status: 500 }
        );
    }
}

// ─── DELETE /api/resumes/[id] ─────────────────────────────────────────────────

/**
 * DELETE /api/resumes/[id]
 *
 * Permanently deletes the resume. Also cleans up the associated PDF blob
 * from Vercel Blob storage if one exists.
 *
 * ── Default resume guard ─────────────────────────────────────────────────────
 * If the deleted resume was the user's default AND the user has remaining
 * resumes, we automatically promote the most recently updated remaining resume
 * to be the new default. This prevents users from ending up with no default
 * resume without any UI intervention.
 *
 * If this was the user's ONLY resume, no promotion is needed.
 *
 * Auth: Owner only.
 */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
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

        // ── Verify ownership ──────────────────────────────────────────────────
        const { resume, error: ownershipError } = await getOwnedResume(userId, id);
        if (ownershipError) return ownershipError;

        const wasDefault = (resume as { isDefault: boolean }).isDefault;

        // ── Delete the resume ─────────────────────────────────────────────────
        await Resume.deleteOne({ _id: id, userId });

        // ── Clean up Vercel Blob PDF (fire-and-forget) ────────────────────────
        const pdfUrl = (resume as { pdfUrl?: string }).pdfUrl;
        if (pdfUrl) {
            try {
                // Dynamic import to avoid importing the blob SDK in every route
                const { del } = await import('@vercel/blob');
                await del(pdfUrl);
                console.log(`🗑️  PDF blob deleted: ${pdfUrl}`);
            } catch (blobError) {
                // Non-critical — log but don't fail the deletion
                console.warn('⚠️  Failed to delete PDF blob:', blobError);
            }
        }

        // ── Auto-promote a new default if needed ──────────────────────────────
        let newDefaultId: string | null = null;

        if (wasDefault) {
            const nextResume = await Resume.findOneAndUpdate(
                { userId }, // Any remaining resume for this user
                { $set: { isDefault: true } },
                {
                    sort: { updatedAt: -1 }, // Promote the most recently edited
                    new:  true,
                    projection: { _id: 1, title: 1 },
                }
            ).lean();

            if (nextResume) {
                newDefaultId = (nextResume as { _id: Types.ObjectId })._id.toString();
                console.log(
                    `↑  Resume ${newDefaultId} auto-promoted to default after ` +
                    `resume ${id} was deleted for user ${session.user.id}`
                );
            }
        }

        console.log(`🗑️  Resume ${id} deleted for user ${session.user.id}`);

        return NextResponse.json({
            success: true,
            data: {
                message:         'Resume deleted successfully.',
                newDefaultResumeId: newDefaultId, // null if no resumes remain
            },
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error(`❌ DELETE /api/resumes/[id] error:`, error);
        return NextResponse.json(
            { success: false, error: { message, code: 'RESUME_DELETE_ERROR' } },
            { status: 500 }
        );
    }
}
