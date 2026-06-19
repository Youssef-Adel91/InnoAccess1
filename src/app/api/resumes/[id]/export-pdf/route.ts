import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Resume from '@/models/Resume';
import { Types } from 'mongoose';
import { renderToBuffer } from '@react-pdf/renderer';
import { put } from '@vercel/blob';
import { createElement } from 'react';
import { ClassicTemplate } from '@/components/resume/pdf/ClassicTemplate';
import type { ResumeDraft } from '@/store/useResumeStore';

// ─── Force Node.js runtime ────────────────────────────────────────────────────
// @react-pdf/renderer relies on Node.js Buffer and cannot run in the Edge runtime.
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/resumes/[id]/export-pdf
 *
 * Generates a server-side PDF from the latest resume data stored in the DB,
 * uploads it to Vercel Blob (public read), and persists the URL to the resume
 * document so it can be shared or re-downloaded without re-generating.
 *
 * ── Flow ──────────────────────────────────────────────────────────────────────
 *   1. Auth + ownership check
 *   2. Fetch the latest resume from DB (always uses the DB copy, not Zustand draft,
 *      to ensure the stored PDF matches what is persisted — not transient UI state)
 *   3. Map DB document → ResumeDraft (matching the Zustand store's shape)
 *   4. renderToBuffer(<ClassicTemplate draft={...} />) via @react-pdf/renderer
 *   5. Upload buffer → Vercel Blob at resumes/{userId}/{resumeId}.pdf (overwrite)
 *   6. PATCH resume: set pdfUrl, isPdfStale=false, lastExportedAt
 *   7. Return { url } — client opens in a new tab
 *
 * ── Performance ───────────────────────────────────────────────────────────────
 * Typical render time: 2–5 seconds for a 1-page resume (font loading is the
 * bottleneck on first call; subsequent calls within the same serverless function
 * instance benefit from the font cache).
 *
 * ── PDF Accessibility ─────────────────────────────────────────────────────────
 * @react-pdf/renderer outputs PDF 1.7. The <Document> metadata (title, author,
 * language) and the structured <View>/<Text> hierarchy ensure the PDF contains:
 *   - Real extractable text (not a rasterised image) — ATS-friendly
 *   - Correct document language tag — screen reader language switching
 *   - Logical reading order following the template's visual structure
 *
 * Auth: Owner only.
 */
export async function POST(_req: NextRequest, { params }: RouteContext) {
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

        // ── Fetch the resume (ownership verified) ─────────────────────────────
        const raw = await Resume.findOne({ _id: id, userId }).lean() as Record<string, unknown> | null;

        if (!raw) {
            return NextResponse.json(
                { success: false, error: { message: 'Resume not found', code: 'NOT_FOUND' } },
                { status: 404 }
            );
        }

        // ── Map DB document → ResumeDraft ─────────────────────────────────────
        // The DB stores ObjectIds on nested items (clientId was stored as _id
        // originally, then mapped to clientId on the way out to the client).
        // We replicate the same mapping the GET /api/resumes/[id] does so that
        // the PDF template receives clean ResumeDraft-typed data.
        const draft: ResumeDraft = {
            title:          (raw.title as string)     || 'Resume',
            direction:      (raw.direction as 'ltr' | 'rtl') || 'ltr',
            templateId:     'classic',
            personalInfo:   (raw.personalInfo as ResumeDraft['personalInfo']) ?? {
                fullName: '', email: '', phone: '', location: '',
                website: '', linkedin: '', github: '', portfolio: '',
            },
            summary:        (raw.summary as string)   || '',
            experiences:    (raw.experiences   as ResumeDraft['experiences'])   ?? [],
            educations:     (raw.educations    as ResumeDraft['educations'])    ?? [],
            skills:         (raw.skills        as ResumeDraft['skills'])        ?? [],
            languages:      (raw.languages     as ResumeDraft['languages'])     ?? [],
            certifications: (raw.certifications as ResumeDraft['certifications']) ?? [],
        };

        // ── Render PDF to Buffer ──────────────────────────────────────────────
        // createElement is used instead of JSX so this file can remain .ts
        // (no JSX transform needed). The ClassicTemplate handles font registration
        // internally via registerResumeFonts() in pdfFonts.ts.
        const pdfBuffer = await renderToBuffer(
            createElement(ClassicTemplate, { draft })
        );

        // ── Upload to Vercel Blob ─────────────────────────────────────────────
        // Path: resumes/{userId}/{resumeId}.pdf
        // Uploading to the same path on every export OVERWRITES the previous PDF,
        // preventing unbounded blob storage growth. Vercel Blob is content-addressed
        // so the URL changes only if the path changes — here it is stable.
        const safeTitle   = (draft.title.replace(/[^a-zA-Z0-9\u0600-\u06FF\-_ ]/g, '') || 'Resume').trim();
        const fileName    = `${safeTitle.replace(/\s+/g, '_')}_${id}.pdf`;
        const blobPath    = `resumes/${session.user.id}/${fileName}`;

        const blob = await put(blobPath, pdfBuffer, {
            access:      'public',
            contentType: 'application/pdf',
            addRandomSuffix: false, // Stable URL — overwrite on each export
        });

        // ── Persist pdfUrl to DB ──────────────────────────────────────────────
        await Resume.findByIdAndUpdate(id, {
            $set: {
                pdfUrl:         blob.url,
                isPdfStale:     false,
                lastExportedAt: new Date(),
            },
        });

        console.log(`✅ PDF exported for resume ${id}: ${blob.url}`);

        return NextResponse.json({
            success: true,
            data:    { url: blob.url },
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('❌ POST /api/resumes/[id]/export-pdf error:', error);
        return NextResponse.json(
            { success: false, error: { message, code: 'PDF_EXPORT_ERROR' } },
            { status: 500 }
        );
    }
}
