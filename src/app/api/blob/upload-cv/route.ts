import { put } from '@vercel/blob';
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

/**
 * POST /api/blob/upload-cv?filename=<name>
 *
 * Edge Runtime route — streams a PDF CV directly to Vercel Blob.
 * Separate from /api/blob/upload (images only) because this route:
 *   - Accepts application/pdf exclusively.
 *   - Stores files under the `trainer-cvs/` prefix for organization.
 *   - Allows trainer, company, and admin roles (same as image upload).
 *
 * Called by TrainerRegistrationForm via XHR so upload progress is trackable.
 */
export const runtime = 'edge';

export async function POST(request: Request): Promise<Response> {
    // JWT auth — Edge-compatible
    const token = await getToken({
        req: request as any,
        secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || !['trainer', 'company', 'admin', 'user'].includes(token.role as string)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
        return NextResponse.json(
            { error: '"filename" query param is required.' },
            { status: 400 }
        );
    }

    // Strict content-type check — PDFs only
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.startsWith('application/pdf')) {
        return NextResponse.json(
            { error: 'Only PDF files are accepted for CV uploads.' },
            { status: 415 } // 415 Unsupported Media Type
        );
    }

    // Sanitise filename: strip path separators, limit length
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
    const blobPath = `trainer-cvs/${Date.now()}-${safeName}`;

    try {
        const blob = await put(blobPath, request.body!, {
            access: 'public',
            contentType: 'application/pdf',
        });

        return NextResponse.json({ url: blob.url });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Upload failed';
        console.error('❌ CV Blob upload error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
