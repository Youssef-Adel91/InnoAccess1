import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Resume, { MAX_RESUMES_PER_USER } from '@/models/Resume';
import { Types } from 'mongoose';

// ─── GET /api/resumes ─────────────────────────────────────────────────────────

/**
 * GET /api/resumes
 *
 * Returns the authenticated user's resume list.
 *
 * ── Payload design ───────────────────────────────────────────────────────────
 * Deliberately excludes deeply nested arrays (experiences, educations, skills,
 * languages, certifications) to keep the list payload light.
 * The full document is fetched separately via GET /api/resumes/[id] only when
 * the user opens the builder.
 *
 * Returns: Array of resume metadata + summary stats (entryCount).
 *
 * Auth: Any authenticated user.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json(
                { success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
                { status: 401 }
            );
        }

        await connectDB();

        const userId = new Types.ObjectId(session.user.id);

        /**
         * Projection — include only the fields needed for the "My Resumes" list card:
         *   - title, direction, isDefault, templateId
         *   - isPdfStale indicator fields: updatedAt, lastExportedAt, pdfUrl
         *   - Entry counts derived from the array lengths (not the arrays themselves)
         *
         * We use aggregation rather than .lean() projection because Mongoose's
         * lean() cannot compute derived fields like array lengths server-side.
         */
        const resumes = await Resume.aggregate([
            { $match: { userId } },
            { $sort: { updatedAt: -1 } }, // Most recently edited first

            {
                $project: {
                    title:          1,
                    direction:      1,
                    isDefault:      1,
                    templateId:     1,
                    pdfUrl:         1,
                    lastExportedAt: 1,
                    createdAt:      1,
                    updatedAt:      1,

                    // Summary entry counts — useful for the list card subtitle
                    // e.g. "3 experiences · 2 educations · 6 skills"
                    experienceCount:    { $size: '$experiences' },
                    educationCount:     { $size: '$educations' },
                    skillCount:         { $size: '$skills' },
                    languageCount:      { $size: '$languages' },
                    certificationCount: { $size: '$certifications' },

                    // Computed: has the resume been edited since last PDF export?
                    // Returned as a boolean so the client doesn't need to compare dates.
                    isPdfStale: {
                        $cond: {
                            if: {
                                $or: [
                                    { $eq:  ['$pdfUrl', null] },
                                    { $eq:  ['$pdfUrl', undefined] },
                                    { $eq:  ['$lastExportedAt', null] },
                                    { $gt:  ['$updatedAt', '$lastExportedAt'] },
                                ],
                            },
                            then: true,
                            else: false,
                        },
                    },
                },
            },
        ]);

        return NextResponse.json({
            success: true,
            data: {
                resumes,
                meta: {
                    count:    resumes.length,
                    maxAllowed: MAX_RESUMES_PER_USER,
                    canCreate: resumes.length < MAX_RESUMES_PER_USER,
                },
            },
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('❌ GET /api/resumes error:', error);
        return NextResponse.json(
            { success: false, error: { message, code: 'RESUMES_FETCH_ERROR' } },
            { status: 500 }
        );
    }
}

// ─── POST /api/resumes ────────────────────────────────────────────────────────

/**
 * POST /api/resumes
 *
 * Creates a new blank resume for the authenticated user.
 *
 * ── 3-resume limit ───────────────────────────────────────────────────────────
 * We enforce MAX_RESUMES_PER_USER = 3 at the database level by counting the
 * user's existing resumes BEFORE inserting. We do this atomically by checking
 * the count in the same request to avoid race conditions (two simultaneous POST
 * requests could both pass the count check). A unique compound index at the DB
 * layer would be more bulletproof but resumes don't have a natural unique key,
 * so the count check is the appropriate guard here.
 *
 * ── isDefault logic ──────────────────────────────────────────────────────────
 * The FIRST resume created by a user is automatically set as their default.
 * Subsequent resumes are NOT default — the user can change this via PATCH.
 *
 * Body: {
 *   title:     string  (required — "Software Developer CV")
 *   direction: 'ltr' | 'rtl'  (required — determines Arabic vs English PDF)
 * }
 *
 * Returns: The newly created resume document (metadata only — arrays are empty).
 *
 * Auth: Any authenticated user.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json(
                { success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
                { status: 401 }
            );
        }

        await connectDB();

        const userId = new Types.ObjectId(session.user.id);

        // ── Enforce 3-resume hard limit ───────────────────────────────────────
        const existingCount = await Resume.countDocuments({ userId });

        if (existingCount >= MAX_RESUMES_PER_USER) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: `You can have a maximum of ${MAX_RESUMES_PER_USER} resumes. Please delete an existing one before creating a new one.`,
                        code:    'RESUME_LIMIT_EXCEEDED',
                        limit:   MAX_RESUMES_PER_USER,
                        current: existingCount,
                    },
                },
                { status: 403 }
            );
        }

        // ── Parse and validate body ───────────────────────────────────────────
        let body: unknown;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json(
                { success: false, error: { message: 'Invalid JSON body', code: 'INVALID_BODY' } },
                { status: 400 }
            );
        }

        const { title, direction } = body as {
            title?:     unknown;
            direction?: unknown;
        };

        const cleanTitle = typeof title === 'string' && title.trim().length > 0
            ? title.trim().slice(0, 100)
            : 'My Resume';

        const cleanDirection = direction === 'rtl' ? 'rtl' : 'ltr';

        // ── isDefault: first resume auto-becomes default ───────────────────────
        const isFirst = existingCount === 0;

        // Pre-fill personalInfo with data from the user's existing profile
        // so they don't have to retype their name/email in Step 0.
        const personalInfoPrefill = {
            fullName: session.user.name  ?? '',
            email:    session.user.email ?? '',
        };

        // ── Create the resume ─────────────────────────────────────────────────
        const resume = await Resume.create({
            userId,
            title:       cleanTitle,
            direction:   cleanDirection,
            isDefault:   isFirst,
            personalInfo: personalInfoPrefill,
            // All array fields default to [] via the schema
        });

        console.log(
            `✅ Resume created: ${resume._id} for user ${userId} ` +
            `("${cleanTitle}", ${cleanDirection}, isDefault=${isFirst})`
        );

        return NextResponse.json(
            {
                success: true,
                data: {
                    resume: {
                        _id:       resume._id,
                        title:     resume.title,
                        direction: resume.direction,
                        isDefault: resume.isDefault,
                        createdAt: resume.createdAt,
                        updatedAt: resume.updatedAt,
                    },
                    meta: {
                        totalResumes: existingCount + 1,
                        maxAllowed:   MAX_RESUMES_PER_USER,
                        canCreate:    existingCount + 1 < MAX_RESUMES_PER_USER,
                    },
                },
            },
            { status: 201 }
        );

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('❌ POST /api/resumes error:', error);
        return NextResponse.json(
            { success: false, error: { message, code: 'RESUME_CREATE_ERROR' } },
            { status: 500 }
        );
    }
}
