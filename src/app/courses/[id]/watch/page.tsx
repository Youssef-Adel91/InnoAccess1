'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, Lock, CheckCircle } from 'lucide-react';

interface Course {
    _id: string;
    title: string;
    modules: Module[];
}

interface Module {
    _id: string;
    title: string;
    videos: VideoLesson[];
    order: number;
}

interface VideoLesson {
    _id: string;
    title: string;
    bunnyVideoId: string;
    url: string;
    duration: number;
    status: string;
    isFreePreview: boolean;
    transcript: string;
}

export default function CoursePlayerPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session, status } = useSession();
    const courseId = params.id as string;

    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentVideo, setCurrentVideo] = useState<VideoLesson | null>(null);
    const [isEnrolled, setIsEnrolled] = useState(false);

    useEffect(() => {
        if (status === 'loading') return;
        if (!session) {
            router.push('/auth/signin');
            return;
        }
        fetchCourse();
    }, [session, status, courseId]);

    const fetchCourse = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/courses/${courseId}`);
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to fetch course');
            }

            const courseData = result.data?.course;
            setCourse(courseData);

            // Set first approved video as current
            if (courseData?.modules?.length > 0) {
                for (const module of courseData.modules) {
                    const approvedVideo = module.videos.find((v: VideoLesson) => v.status === 'approved');
                    if (approvedVideo) {
                        setCurrentVideo(approvedVideo);
                        break;
                    }
                }
            }

            // TODO: Check if enrolled
            setIsEnrolled(true); // For now, assume enrolled if they got here
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading course...</p>
                </div>
            </div>
        );
    }

    if (!session || error || !course) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to load course</h2>
                    <p className="text-gray-600 mb-6">{error || 'Please try again later.'}</p>
                    <Link href="/courses" className="text-blue-600 hover:underline">
                        Back to Courses
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-0">
                {/* Video Player Section */}
                <div className="lg:col-span-3 bg-black">
                    <div className="p-4">
                        <Link href={`/courses/${courseId}`} className="inline-flex items-center text-white hover:text-gray-300 mb-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            Back to Course
                        </Link>
                    </div>

                    {currentVideo ? (
                        <div>
                            {/* Bunny.net Video Player */}
                            <div className="aspect-video bg-black">
                                <iframe
                                    src={`https://iframe.mediadelivery.net/embed/${process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID}/${currentVideo.bunnyVideoId}?autoplay=false&preload=true`}
                                    loading="lazy"
                                    style={{
                                        border: 0,
                                        width: '100%',
                                        height: '100%',
                                    }}
                                    allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                                    allowFullScreen
                                ></iframe>
                            </div>

                            {/* Video Info */}
                            <div className="p-6 bg-gray-900 text-white">
                                <h1 className="text-2xl font-bold mb-2">{currentVideo.title}</h1>
                                <p className="text-gray-400 text-sm mb-4">
                                    Duration: {Math.floor(currentVideo.duration / 60)}:{(currentVideo.duration % 60).toString().padStart(2, '0')}
                                </p>

                                {/* Transcript */}
                                <div className="mt-6">
                                    <h3 className="text-lg font-semibold mb-2">Transcript</h3>
                                    <div className="bg-gray-800 p-4 rounded-lg max-h-60 overflow-y-auto">
                                        <p className="text-gray-300 whitespace-pre-wrap">{currentVideo.transcript}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="aspect-video flex items-center justify-center bg-gray-800">
                            <p className="text-white">No video selected</p>
                        </div>
                    )}
                </div>

                {/* Sidebar - Course Content */}
                <div className="lg:col-span-1 bg-gray-100 min-h-screen overflow-y-auto">
                    <div className="p-4">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">{course.title}</h2>

                        <div className="space-y-4">
                            {course.modules.map((module) => (
                                <div key={module._id} className="bg-white rounded-lg shadow">
                                    <div className="px-4 py-3 bg-gray-50 border-b">
                                        <h3 className="font-semibold text-gray-900 text-sm">
                                            Module {module.order}: {module.title}
                                        </h3>
                                    </div>

                                    <div className="divide-y">
                                        {module.videos
                                            .filter((v) => v.status === 'approved')
                                            .map((video, index) => {
                                                const isCurrentVideo = currentVideo?._id === video._id;
                                                const canWatch = isEnrolled || video.isFreePreview;

                                                return (
                                                    <button
                                                        key={video._id}
                                                        onClick={() => canWatch && setCurrentVideo(video)}
                                                        disabled={!canWatch}
                                                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${isCurrentVideo ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                                                            } ${!canWatch ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <p className={`text-sm font-medium ${isCurrentVideo ? 'text-blue-600' : 'text-gray-900'}`}>
                                                                    {index + 1}. {video.title}
                                                                </p>
                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                                                                </p>
                                                                {video.isFreePreview && (
                                                                    <span className="inline-block mt-1 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                                                                        Free Preview
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {!canWatch && <Lock className="h-4 w-4 text-gray-400 ml-2" />}
                                                            {isCurrentVideo && <CheckCircle className="h-4 w-4 text-blue-600 ml-2" />}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
