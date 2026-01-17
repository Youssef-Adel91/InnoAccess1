'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Clock, Users, Star, Video, Lock, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { enrollInCourse, checkEnrollment } from '@/app/actions/enrollment';

interface Course {
    _id: string;
    title: string;
    description: string;
    categoryId: {
        name: string;
        slug: string;
    };
    trainerId: {
        name: string;
        email: string;
    };
    isFree: boolean;
    price: number;
    thumbnail?: string;
    enrollmentCount: number;
    rating: number;
    modules: Module[];
    isPublished: boolean;
}

interface Module {
    _id: string;
    title: string;
    description?: string;
    videos: VideoLesson[];
    order: number;
}

interface VideoLesson {
    _id: string;
    title: string;
    duration: number;
    status: string;
    isFreePreview: boolean;
}

export default function CourseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const courseId = params.id as string;

    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [enrolling, setEnrolling] = useState(false);

    useEffect(() => {
        fetchCourse();
        checkEnrollmentStatus();
    }, [courseId]);

    const fetchCourse = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/courses/${courseId}`);
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to fetch course');
            }

            setCourse(result.data?.course || null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const checkEnrollmentStatus = async () => {
        try {
            const result = await checkEnrollment(courseId);
            if (result.success) {
                setIsEnrolled(result.data?.isEnrolled || false);
            }
        } catch (err) {
            console.error('Failed to check enrollment:', err);
        }
    };

    const handleEnroll = async () => {
        if (!session) {
            router.push('/auth/signin');
            return;
        }

        setEnrolling(true);
        setError(null);

        try {
            const result = await enrollInCourse(courseId);

            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to enroll');
            }

            setIsEnrolled(true);
            await fetchCourse(); // Refresh to update enrollment count
        } catch (err: any) {
            setError(err.message);
        } finally {
            setEnrolling(false);
        }
    };

    const getTotalDuration = () => {
        if (!course) return 0;
        let total = 0;
        course.modules.forEach((module) => {
            module.videos.forEach((video) => {
                if (video.status === 'approved') {
                    total += video.duration;
                }
            });
        });
        return total;
    };

    const getTotalLessons = () => {
        if (!course) return 0;
        let total = 0;
        course.modules.forEach((module) => {
            total += module.videos.filter((v) => v.status === 'approved').length;
        });
        return total;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading course...</p>
                </div>
            </div>
        );
    }

    if (error || !course) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Course not found</h2>
                    <p className="text-gray-600 mb-6">{error || 'The course you are looking for does not exist.'}</p>
                    <Link href="/courses">
                        <Button variant="primary">Back to Courses</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const totalDuration = getTotalDuration();
    const totalLessons = getTotalLessons();

    return (
        <main className="min-h-screen bg-gray-50">
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Link href="/courses" className="inline-flex items-center text-white hover:text-gray-200 mb-6">
                        <ArrowLeft className="h-5 w-5 mr-2" />
                        Back to Courses
                    </Link>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Course Info */}
                        <div className="lg:col-span-2">
                            <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm font-medium mb-4">
                                {course.categoryId.name}
                            </span>
                            <h1 className="text-4xl font-bold mb-4">{course.title}</h1>
                            <p className="text-lg text-white/90 mb-6">{course.description}</p>

                            <div className="flex items-center space-x-6 text-sm">
                                <span className="flex items-center">
                                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400 mr-1" />
                                    {course.rating || 0} rating
                                </span>
                                <span className="flex items-center">
                                    <Users className="h-5 w-5 mr-1" />
                                    {course.enrollmentCount || 0} students
                                </span>
                                <span className="flex items-center">
                                    <Clock className="h-5 w-5 mr-1" />
                                    {Math.floor(totalDuration / 60)} min
                                </span>
                            </div>

                            <p className="mt-4 text-white/80">
                                Created by <strong>{course.trainerId.name}</strong>
                            </p>
                        </div>

                        {/* Enrollment Card */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-lg shadow-xl p-6">
                                {course.thumbnail && (
                                    <img
                                        src={course.thumbnail}
                                        alt={course.title}
                                        className="w-full h-40 object-cover rounded-lg mb-4"
                                    />
                                )}

                                <div className="text-center mb-6">
                                    {course.isFree ? (
                                        <p className="text-3xl font-bold text-green-600">Free</p>
                                    ) : (
                                        <div>
                                            <p className="text-3xl font-bold text-gray-900">
                                                ${(course.price / 100).toFixed(2)}
                                            </p>
                                            <p className="text-sm text-gray-600">One-time payment</p>
                                        </div>
                                    )}
                                </div>

                                {session ? (
                                    isEnrolled ? (
                                        <Link href={`/courses/${courseId}/watch`}>
                                            <Button variant="primary" className="w-full mb-3">
                                                Continue Learning
                                            </Button>
                                        </Link>
                                    ) : (
                                        <Button
                                            variant="primary"
                                            className="w-full mb-3"
                                            onClick={handleEnroll}
                                            disabled={enrolling}
                                        >
                                            {enrolling ? 'Enrolling...' : (course.isFree ? 'Enroll for Free' : 'Buy Now')}
                                        </Button>
                                    )
                                ) : (
                                    <Link href="/auth/signin">
                                        <Button variant="primary" className="w-full mb-3">
                                            Sign in to Enroll
                                        </Button>
                                    </Link>
                                )}

                                <div className="text-sm text-gray-600 space-y-2">
                                    <p className="flex items-center">
                                        <BookOpen className="h-4 w-4 mr-2" />
                                        {totalLessons} lessons
                                    </p>
                                    <p className="flex items-center">
                                        <Video className="h-4 w-4 mr-2" />
                                        {course.modules.length} modules
                                    </p>
                                    <p className="flex items-center">
                                        <Clock className="h-4 w-4 mr-2" />
                                        {Math.floor(totalDuration / 3600)}h {Math.floor((totalDuration % 3600) / 60)}m
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Course Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Course Content</h2>

                        <div className="space-y-4">
                            {course.modules.map((module, index) => (
                                <div key={module._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                                    <div className="px-6 py-4 bg-gray-50 border-b">
                                        <h3 className="font-semibold text-gray-900">
                                            Module {module.order}: {module.title}
                                        </h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {module.videos.filter((v) => v.status === 'approved').length} lessons
                                        </p>
                                    </div>

                                    <div className="divide-y">
                                        {module.videos
                                            .filter((v) => v.status === 'approved')
                                            .map((video, videoIndex) => (
                                                <div key={video._id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50">
                                                    <div className="flex items-center flex-1">
                                                        {video.isFreePreview || course.isFree || isEnrolled ? (
                                                            <PlayCircle className="h-5 w-5 text-blue-600 mr-3" />
                                                        ) : (
                                                            <Lock className="h-5 w-5 text-gray-400 mr-3" />
                                                        )}
                                                        <div>
                                                            <p className="font-medium text-gray-900">{video.title}</p>
                                                            {video.isFreePreview && !course.isFree && (
                                                                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                                                                    Free Preview
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className="text-sm text-gray-600">
                                                        {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                                                    </span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
                            <h3 className="font-bold text-gray-900 mb-4">What you'll learn</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start">
                                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                    <span>Master the fundamentals</span>
                                </li>
                                <li className="flex items-start">
                                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                    <span>Build real-world projects</span>
                                </li>
                                <li className="flex items-start">
                                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                    <span>Gain practical experience</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

function CheckCircle({ className }: { className: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}
