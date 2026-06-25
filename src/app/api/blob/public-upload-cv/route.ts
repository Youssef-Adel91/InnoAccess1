import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

/**
 * POST /api/blob/public-upload-cv?filename=<name>
 *
 * Edge Runtime route — streams a PDF CV directly to Vercel Blob.
 * Public route strictly for Trainer Registration flow before session is created.
 *
 * Security Requirements:
 * - PDF only
 * - 5MB size limit
 */
export const runtime = 'edge';

export async function POST(request: Request): Promise<Response> {
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
            { status: 415 }
        );
    }

    // Strict size check - 5MB max
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) {
        return NextResponse.json(
            { error: 'File size exceeds the 5MB limit.' },
            { status: 413 }
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
        console.error('❌ Public CV Blob upload error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
