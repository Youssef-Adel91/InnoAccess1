'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import crypto from 'crypto';
import { VideoStatus } from '@/models/Course';
import { Types } from 'mongoose';

/**
 * Generate secure Bunny.net upload signature for direct client uploads
 * Creates video in Bunny library and returns SHA256 signature for authentication
 */
export async function generateBunnyUploadSignature(videoTitle: string) {
    try {
        const session = await getServerSession(authOptions);

        // Only trainers and admins can upload videos
        if (!session || !['trainer', 'admin'].includes(session.user.role)) {
            throw new Error('Unauthorized - only trainers and admins can upload videos');
        }

        const libraryId = process.env.BUNNY_LIBRARY_ID!;
        const apiKey = process.env.BUNNY_API_KEY!;
        const cdnHostname = process.env.BUNNY_CDN_HOSTNAME!;

        if (!libraryId || !apiKey) {
            throw new Error('Bunny.net credentials not configured');
        }

        console.log('📹 Creating video in Bunny library:', videoTitle);

        // Step 1: Create video in Bunny.net library
        const createResponse = await fetch(
            `https://video.bunnycdn.com/library/${libraryId}/videos`,
            {
                method: 'POST',
                headers: {
                    'AccessKey': apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title: videoTitle }),
            }
        );

        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            console.error('❌ Bunny video creation failed:', errorText);
            throw new Error(`Failed to create video in Bunny.net: ${createResponse.statusText}`);
        }

        const { guid: videoId } = await createResponse.json();
        console.log('✅ Video created with ID:', videoId);

        // Step 2: Generate SHA256 signature for secure upload
        const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour validity

        // Signature format: libraryId + apiKey + expirationTime + videoId
        const signatureData = `${libraryId}${apiKey}${expirationTime}${videoId}`;
        const authSignature = crypto
            .createHash('sha256')
            .update(signatureData)
            .digest('hex');

        console.log('🔐 Generated upload signature (expires in 1 hour)');

        return {
            success: true,
            data: {
                videoId,
                libraryId,
                authSignature,
                expirationTime,
                uploadUrl: `https://video.bunnycdn.com/tusupload`,
                cdnHostname,
            },
        };
    } catch (error: any) {
        console.error('❌ Generate upload signature error:', error);
        return {
            success: false,
            error: {
                message: error.message || 'Failed to generate upload signature',
                code: 'SIGNATURE_GENERATION_ERROR',
            },
        };
    }
}

/**
 * Save video metadata to database after successful upload
 * Auto-approves if uploader is admin, sets to pending if trainer
 */
export async function saveLessonVideo(data: {
    courseId: string;
    moduleIndex: number;
    videoData: {
        title: string;
        bunnyVideoId: string;
        transcript: string;
        duration: number;
        order: number;
        isFreePreview?: boolean;
    };
}) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !['trainer', 'admin'].includes(session.user.role)) {
            throw new Error('Unauthorized');
        }

        const { connectDB } = await import('@/lib/db');
        const Course = (await import('@/models/Course')).default;

        await connectDB();

        const { courseId, moduleIndex, videoData } = data;

        // Find the course
        const course = await Course.findById(courseId);

        if (!course) {
            throw new Error('Course not found');
        }

        // Verify user has permission to add videos to this course
        if (
            session.user.role === 'trainer' &&
            course.trainerId.toString() !== session.user.id
        ) {
            throw new Error('You can only add videos to your own courses');
        }

        // Auto-approve if uploader is admin, otherwise set to pending
        const status: VideoStatus = session.user.role === 'admin' ? VideoStatus.APPROVED : VideoStatus.PENDING;

        // Generate CDN URL
        const cdnHostname = process.env.BUNNY_CDN_HOSTNAME!;
        const cdnUrl = `https://${cdnHostname}/${videoData.bunnyVideoId}/playlist.m3u8`;

        // Add video to module
        const newVideo = {
            ...videoData,
            url: cdnUrl,
            status,
            uploadedBy: new Types.ObjectId(session.user.id),
            uploadedAt: new Date(),
            isFreePreview: videoData.isFreePreview || false,
        };

        course.modules[moduleIndex].videos.push(newVideo);

        await course.save();

        console.log(`✅ Video saved with status: ${status}`);

        // Serialize to plain object for client component
        const serializedVideo = JSON.parse(JSON.stringify(newVideo));

        return {
            success: true,
            data: {
                video: serializedVideo,
                status,
            },
        };
    } catch (error: any) {
        console.error('❌ Save lesson video error:', error);
        return {
            success: false,
            error: {
                message: error.message || 'Failed to save video',
                code: 'SAVE_VIDEO_ERROR',
            },
        };
    }
}

/**
 * Update video approval status (admin only)
 */
export async function updateVideoStatus(data: {
    courseId: string;
    moduleIndex: number;
    videoIndex: number;
    status: 'approved' | 'rejected';
    rejectionReason?: string;
}) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'admin') {
            throw new Error('Unauthorized - admin access required');
        }

        const { connectDB } = await import('@/lib/db');
        const Course = (await import('@/models/Course')).default;

        await connectDB();

        const { courseId, moduleIndex, videoIndex, status, rejectionReason } = data;

        const course = await Course.findById(courseId);

        if (!course) {
            throw new Error('Course not found');
        }

        const video = course.modules[moduleIndex]?.videos[videoIndex];

        if (!video) {
            throw new Error('Video not found');
        }

        // Update status
        video.status = status === 'approved' ? VideoStatus.APPROVED : VideoStatus.REJECTED;

        if (status === 'rejected' && rejectionReason) {
            video.rejectionReason = rejectionReason;
        }

        await course.save();

        console.log(`✅ Video ${status}:`, video.title);

        return {
            success: true,
            data: {
                video,
                status,
            },
        };
    } catch (error: any) {
        console.error('❌ Update video status error:', error);
        return {
            success: false,
            error: {
                message: error.message || 'Failed to update video status',
                code: 'UPDATE_STATUS_ERROR',
            },
        };
    }
}
