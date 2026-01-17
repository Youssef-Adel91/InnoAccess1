import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Course from '@/models/Course';
import User from '@/models/User';

/**
 * GET /api/admin/pending-videos
 * Fetch all pending videos across all courses for admin review
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'admin') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Unauthorized - admin access required',
                        code: 'UNAUTHORIZED',
                    },
                },
                { status: 401 }
            );
        }

        await connectDB();

        // Fetch all courses with their modules and videos
        const courses = await Course.find({ isDeleted: false })
            .populate('trainerId', 'name email')
            .lean();

        // Extract all pending videos
        const pendingVideos: any[] = [];

        courses.forEach((course) => {
            course.modules.forEach((module: any, moduleIndex: number) => {
                module.videos.forEach((video: any, videoIndex: number) => {
                    if (video.status === 'pending') {
                        pendingVideos.push({
                            courseId: course._id,
                            courseTitle: course.title,
                            moduleIndex,
                            moduleTitle: module.title,
                            videoIndex,
                            videoId: video._id,
                            bunnyVideoId: video.bunnyVideoId,
                            title: video.title,
                            duration: video.duration,
                            transcript: video.transcript,
                            uploadedBy: video.uploadedBy,
                            uploadedAt: video.uploadedAt,
                            trainerId: course.trainerId._id,
                            trainerName: (course.trainerId as any).name,
                            trainerEmail: (course.trainerId as any).email,
                        });
                    }
                });
            });
        });

        // Sort by upload date (newest first)
        pendingVideos.sort((a, b) =>
            new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        );

        console.log(`✅ Found ${pendingVideos.length} pending videos`);

        return NextResponse.json({
            success: true,
            data: {
                videos: pendingVideos,
                count: pendingVideos.length,
            },
        });
    } catch (error: any) {
        console.error('❌ Fetch pending videos error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to fetch pending videos',
                    code: 'SERVER_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
