import { handleUpload, type HandleUploadBody } from '@vercel/blob/next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

/**
 * Vercel Blob client-side upload handler.
 *
 * The browser uploads the file DIRECTLY to Vercel Blob using a short-lived
 * token generated here — the file never passes through the serverless function
 * body, so Vercel's 4.5 MB HTTP limit is completely bypassed.
 *
 * Flow:
 *  1. Client POSTs a token-request JSON to this route.
 *  2. We validate the session and return a signed upload token.
 *  3. Client uses @vercel/blob/client `upload()` to stream the file to Blob.
 */
export async function POST(request: Request): Promise<Response> {
    const session = await getServerSession(authOptions);

    if (!session || !['trainer', 'company', 'admin'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as HandleUploadBody;

    try {
        const jsonResponse = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (pathname) => {
                return {
                    allowedContentTypes: [
                        'image/jpeg',
                        'image/jpg',
                        'image/png',
                        'image/webp',
                        'image/gif',
                    ],
                    maximumSizeInBytes: 10 * 1024 * 1024, // 10 MB
                    tokenPayload: JSON.stringify({ userId: session.user.id }),
                };
            },
            onUploadCompleted: async ({ blob }) => {
                console.log('✅ Blob upload completed:', blob.url);
            },
        });

        return NextResponse.json(jsonResponse);
    } catch (error: any) {
        console.error('❌ Blob upload handler error:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
