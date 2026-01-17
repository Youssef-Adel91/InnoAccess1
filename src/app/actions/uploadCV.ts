'use server';

import { put } from '@vercel/blob';

/**
 * Server action to upload CV to Vercel Blob
 * @param formData - FormData containing the CV file
 * @param userId - User ID to make filename unique
 * @returns Blob URL or error
 */
export async function uploadCVToBlob(formData: FormData, userId: string) {
    try {
        console.log('🔍 Server action called - userId:', userId);
        console.log('🔍 Environment check - BLOB_READ_WRITE_TOKEN exists:', !!process.env.BLOB_READ_WRITE_TOKEN);

        const file = formData.get('cv') as File;

        if (!file) {
            console.error('❌ No file provided');
            return { error: 'No file provided' };
        }

        console.log('📄 File received:', file.name, file.type, file.size);

        // Validate file type
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type)) {
            console.error('❌ Invalid file type:', file.type);
            return { error: 'Invalid file type. Only PDF and Word documents are allowed.' };
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            console.error('❌ File too large:', file.size);
            return { error: 'File size exceeds 5MB limit' };
        }

        // Create unique filename with timestamp and userId
        const timestamp = Date.now();
        const extension = file.name.split('.').pop();
        const filename = `cvs/${userId}_${timestamp}.${extension}`;

        // Upload to Vercel Blob with correct API
        console.log('🚀 Uploading to Vercel Blob:', filename);

        const blob = await put(filename, file, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN,
        });

        console.log('✅ Blob upload successful:', blob.url);

        return { url: blob.url };
    } catch (error: any) {
        console.error('❌ Blob upload error:', error);
        console.error('❌ Error stack:', error.stack);
        return { error: error.message || 'Failed to upload CV' };
    }
}
