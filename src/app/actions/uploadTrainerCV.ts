'use server';

import { put } from '@vercel/blob';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Upload CV file to Vercel Blob (Server-side only for security)
 * Returns the blob URL
 */
export async function uploadTrainerCV(formData: FormData) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'user') {
            throw new Error('Unauthorized - only users can upload CVs');
        }

        const file = formData.get('cv') as File;

        if (!file) {
            throw new Error('No file provided');
        }

        // Validate file type
        if (file.type !== 'application/pdf') {
            throw new Error('Only PDF files are allowed');
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            throw new Error('File size must be less than 5MB');
        }

        console.log('📤 Uploading CV to Vercel Blob...');

        // Upload to Vercel Blob
        const blob = await put(`trainer-cvs/${Date.now()}-${file.name}`, file, {
            access: 'public',
            addRandomSuffix: true,
        });

        console.log('✅ CV uploaded:', blob.url);

        return {
            success: true,
            data: {
                url: blob.url,
            },
        };
    } catch (error: any) {
        console.error('❌ CV upload error:', error);
        return {
            success: false,
            error: {
                message: error.message || 'Failed to upload CV',
                code: 'CV_UPLOAD_ERROR',
            },
        };
    }
}
