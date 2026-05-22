import { put } from '@vercel/blob';
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

/**
 * POST /api/blob/upload?filename=<name>
 *
 * Edge Runtime route — no body-size cap unlike Serverless functions.
 * Streams the image directly to Vercel Blob without buffering in memory.
 *
 * Auth: verified via JWT token (Edge-compatible, no Node.js APIs needed).
 */
export const runtime = 'edge';

export async function POST(request: Request): Promise<Response> {
    // JWT auth — works in Edge Runtime unlike getServerSession
    const token = await getToken({
        req: request as any,
        secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || !['trainer', 'company', 'admin'].includes(token.role as string)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
        return NextResponse.json({ error: 'filename query param is required' }, { status: 400 });
    }

    const contentType = request.headers.get('content-type') || 'application/octet-stream';
    if (!contentType.startsWith('image/')) {
        return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    try {
        const blob = await put(`course-thumbnails/${Date.now()}-${filename}`, request.body!, {
            access: 'public',
            contentType,
        });

        return NextResponse.json({ url: blob.url });
    } catch (error: any) {
        console.error('❌ Blob upload error:', error);
        return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
    }
}
