'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { VideoApprovalCard } from '@/components/admin/VideoApprovalCard';

interface PendingVideo {
    courseId: string;
    courseTitle: string;
    moduleIndex: number;
    moduleTitle: string;
    videoIndex: number;
    videoId: string;
    bunnyVideoId: string;
    title: string;
    duration: number;
    transcript: string;
    uploadedBy: string;
    uploadedAt: Date;
    trainerId: string;
    trainerName: string;
    trainerEmail: string;
}

export default function AdminApprovalsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [videos, setVideos] = useState<PendingVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<{ course?: string; trainer?: string }>({});

    // Check if user is admin
    useEffect(() => {
        if (status === 'loading') return;

        if (!session || session.user.role !== 'admin') {
            router.push('/');
        }
    }, [session, status, router]);

    // Fetch pending videos
    const fetchPendingVideos = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/admin/pending-videos');
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error?.message || 'Failed to fetch pending videos');
            }

            setVideos(data.data.videos);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session?.user.role === 'admin') {
            fetchPendingVideos();
        }
    }, [session]);

    // Get unique courses and trainers for filters
    const uniqueCourses = Array.from(new Set(videos.map(v => v.courseTitle)));
    const uniqueTrainers = Array.from(new Set(videos.map(v => v.trainerName)));

    // Filter videos
    const filteredVideos = videos.filter(video => {
        if (filter.course && video.courseTitle !== filter.course) return false;
        if (filter.trainer && video.trainerName !== filter.trainer) return false;
        return true;
    });

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!session || session.user.role !== 'admin') {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-100 py-8">
            <div className="max-w-6xl mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Video Approval Dashboard
                    </h1>
                    <p className="text-gray-600">
                        Review and approve videos uploaded by trainers before they become visible to students.
                    </p>
                </div>

                {/* Stats Bar */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{filteredVideos.length}</h2>
                            <p className="text-gray-600">Pending Videos</p>
                        </div>
                        <div className="text-4xl">🎬</div>
                    </div>
                </div>

                {/* Filters */}
                {videos.length > 0 && (
                    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Filter by Course
                                </label>
                                <select
                                    value={filter.course || ''}
                                    onChange={(e) => setFilter({ ...filter, course: e.target.value || undefined })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">All Courses</option>
                                    {uniqueCourses.map(course => (
                                        <option key={course} value={course}>{course}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Filter by Trainer
                                </label>
                                <select
                                    value={filter.trainer || ''}
                                    onChange={(e) => setFilter({ ...filter, trainer: e.target.value || undefined })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">All Trainers</option>
                                    {uniqueTrainers.map(trainer => (
                                        <option key={trainer} value={trainer}>{trainer}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={fetchPendingVideos}
                                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                                >
                                    🔄 Refresh
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading pending videos...</p>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-800">{error}</p>
                    </div>
                )}

                {/* Empty State */}
                {!loading && filteredVideos.length === 0 && (
                    <div className="bg-white rounded-lg shadow-md p-12 text-center">
                        <div className="text-6xl mb-4">✅</div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            All caught up!
                        </h3>
                        <p className="text-gray-600">
                            There are no pending videos to review at the moment.
                        </p>
                    </div>
                )}

                {/* Video Cards */}
                {!loading && filteredVideos.length > 0 && (
                    <div>
                        {filteredVideos.map((video) => (
                            <VideoApprovalCard
                                key={`${video.courseId}-${video.moduleIndex}-${video.videoIndex}`}
                                video={video}
                                onStatusUpdate={fetchPendingVideos}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
