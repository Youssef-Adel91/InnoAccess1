'use server';

import { put } from '@vercel/blob';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Upload course thumbnail to Vercel Blob (Server-side only for security)
 * Returns the blob URL
 */
export async function uploadCourseThumbnail(formData: FormData) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !['trainer', 'company', 'admin'].includes(session.user.role)) {
            throw new Error('Unauthorized - only trainers or companies can upload thumbnails');
        }

        const file = formData.get('thumbnail') as File;

        if (!file) {
            throw new Error('No file provided');
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            throw new Error('Only image files are allowed');
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            throw new Error('File size must be less than 10MB');
        }

        console.log('📤 Uploading course thumbnail to Vercel Blob...');

        // Upload to Vercel Blob
        const blob = await put(`course-thumbnails/${Date.now()}-${file.name}`, file, {
            access: 'public',
            addRandomSuffix: true,
        });

        console.log('✅ Thumbnail uploaded:', blob.url);

        return {
            success: true,
            data: {
                url: blob.url,
            },
        };
    } catch (error: any) {
        console.error('❌ Thumbnail upload error:', error);
        return {
            success: false,
            error: {
                message: error.message || 'Failed to upload thumbnail',
                code: 'THUMBNAIL_UPLOAD_ERROR',
            },
        };
    }
}
