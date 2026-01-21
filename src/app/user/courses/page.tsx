'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, Video, PlayCircle, Calendar, Clock, Filter } from 'lucide-react';

interface Course {
    _id: string;
    title: string;
    description: string;
    thumbnail?: string;
    courseType: 'RECORDED' | 'LIVE';
    liveSession?: {
        startDate: string;
        durationMinutes: number;
        zoomMeetingLink: string;
    };
    enrolledAt: string;
}

type FilterType = 'all' | 'RECORDED' | 'LIVE';

export default function MyCoursesPage() {
    const { data: session, status } = useSession();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterType>('all');

    useEffect(() => {
        async function fetchEnrollments() {
            try {
                const response = await fetch('/api/user/enrollments');
                const data = await response.json();

                if (data.success) {
                    const enrolledCourses = data.data.enrollments.map((enrollment: any) => ({
                        ...enrollment.courseId,
                        enrolledAt: enrollment.enrolledAt,
                    }));
                    setCourses(enrolledCourses);
                }
            } catch (error) {
                console.error('Failed to fetch courses:', error);
            } finally {
                setLoading(false);
            }
        }

        if (session?.user?.role === 'user') {
            fetchEnrollments();
        }
    }, [session]);

    if (status === 'loading') {
        return (
            <main id="main-content" className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </main>
        );
    }

    if (status === 'unauthenticated' || session?.user?.role !== 'user') {
        redirect('/');
    }

    const filteredCourses = courses.filter((course) => {
        if (filter === 'all') return true;
        return course.courseType === filter;
    });

    const stats = {
        total: courses.length,
        recorded: courses.filter((c) => c.courseType === 'RECORDED').length,
        live: courses.filter((c) => c.courseType === 'LIVE').length,
    };

    return (
        <main id="main-content" className="min-h-screen bg-gray-50 py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
                    <p className="mt-2 text-gray-600">
                        Manage and access all your enrolled courses
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <GraduationCap className="h-8 w-8 text-blue-600" aria-hidden="true" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Courses</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <PlayCircle className="h-8 w-8 text-green-600" aria-hidden="true" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Recorded Courses</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.recorded}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Video className="h-8 w-8 text-red-600" aria-hidden="true" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Live Workshops</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.live}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                    <div className="flex items-center gap-4">
                        <Filter className="h-5 w-5 text-gray-600" aria-hidden="true" />
                        <span className="text-sm font-medium text-gray-700">Filter by:</span>
                        <div className="flex gap-2">
                            {[
                                { value: 'all', label: 'All Courses' },
                                { value: 'RECORDED', label: 'Recorded' },
                                { value: 'LIVE', label: 'Live Workshops' },
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => setFilter(option.value as FilterType)}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === option.value
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Courses List */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading your courses...</p>
                    </div>
                ) : filteredCourses.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                        <GraduationCap className="h-16 w-16 text-gray-400 mx-auto mb-4" aria-hidden="true" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {filter === 'all' ? 'No courses yet' : `No ${filter.toLowerCase()} courses`}
                        </h3>
                        <p className="text-gray-600 mb-6">
                            {filter === 'all'
                                ? "You haven't enrolled in any courses yet."
                                : `You don't have any ${filter.toLowerCase()} courses.`}
                        </p>
                        <Link
                            href="/courses"
                            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Browse All Courses
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCourses.map((course) => (
                            <Link
                                key={course._id}
                                href={`/courses/${course._id}`}
                                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                            >
                                {/* Course Thumbnail */}
                                <div className="relative h-48 bg-gray-200">
                                    {course.thumbnail ? (
                                        <img
                                            src={course.thumbnail}
                                            alt={course.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <GraduationCap className="h-16 w-16 text-gray-400" aria-hidden="true" />
                                        </div>
                                    )}
                                    {/* Type Badge */}
                                    <div className="absolute top-3 right-3">
                                        {course.courseType === 'LIVE' ? (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-600 text-white">
                                                <Video className="h-3 w-3 mr-1" aria-hidden="true" />
                                                LIVE
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-600 text-white">
                                                <PlayCircle className="h-3 w-3 mr-1" aria-hidden="true" />
                                                RECORDED
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Course Info */}
                                <div className="p-4">
                                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                                        {course.title}
                                    </h3>
                                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                        {course.description}
                                    </p>

                                    {/* Live Session Info */}
                                    {course.courseType === 'LIVE' && course.liveSession && (
                                        <div className="space-y-1 mb-3">
                                            <div className="flex items-center text-xs text-gray-600">
                                                <Calendar className="h-3 w-3 mr-1" aria-hidden="true" />
                                                {new Date(course.liveSession.startDate).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center text-xs text-gray-600">
                                                <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
                                                {new Date(course.liveSession.startDate).toLocaleTimeString('en-US', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <p className="text-xs text-gray-500">
                                        Enrolled: {new Date(course.enrolledAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
