'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getTrainerCourses } from '@/app/actions/courseManagement';
import { Plus, BookOpen, Users, Video, Trash2 } from 'lucide-react';

interface Course {
    _id: string;
    title: string;
    description: string;
    categoryId: {
        name: string;
        slug: string;
    };
    isFree: boolean;
    price: number;
    thumbnail?: string;
    enrollmentCount: number;
    isPublished: boolean;
    modules: any[];
}

export default function TrainerDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Check authorization
    useEffect(() => {
        if (status === 'loading') return;

        if (!session || session.user.role !== 'trainer') {
            router.push('/');
        }
    }, [session, status, router]);

    // Fetch courses
    useEffect(() => {
        if (session?.user.role === 'trainer') {
            fetchCourses();
        }
    }, [session]);

    const fetchCourses = async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await getTrainerCourses();

            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to fetch courses');
            }

            setCourses(result.data?.courses || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
        if (!confirm(`Are you sure you want to permanently delete "${courseTitle}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/courses/${courseId}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error?.message || 'Failed to delete course');
            }

            // Refresh courses list
            await fetchCourses();
            alert('Course deleted successfully');
        } catch (err: any) {
            alert(err.message);
        }
    };

    // Calculate stats
    const stats = {
        totalCourses: courses.length,
        publishedCourses: courses.filter(c => c.isPublished).length,
        totalStudents: courses.reduce((sum, c) => sum + (c.enrollmentCount || 0), 0),
        totalLessons: courses.reduce((sum, c) => sum + c.modules.reduce((ms, m) => ms + (m.videos?.length || 0), 0), 0),
    };

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (!session || session.user.role !== 'trainer') {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Welcome back, {session.user.name}!
                    </h1>
                    <p className="mt-2 text-gray-600">
                        Manage your courses and track your teaching journey
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Courses</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.totalCourses}</p>
                            </div>
                            <BookOpen className="h-10 w-10 text-blue-600" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Published</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.publishedCourses}</p>
                            </div>
                            <BookOpen className="h-10 w-10 text-green-600" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Students</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
                            </div>
                            <Users className="h-10 w-10 text-purple-600" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Lessons</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.totalLessons}</p>
                            </div>
                            <Video className="h-10 w-10 text-orange-600" />
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <div className="mb-6">
                    <Link
                        href="/trainer/courses/new"
                        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        Create New Course
                    </Link>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-800">{error}</p>
                    </div>
                )}

                {/* Courses Grid */}
                {courses.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-md p-12 text-center">
                        <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            No courses yet
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Get started by creating your first course
                        </p>
                        <Link
                            href="/trainer/courses/new"
                            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="h-5 w-5 mr-2" />
                            Create Course
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map((course) => (
                            <div key={course._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                                {/* Thumbnail */}
                                <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 relative">
                                    {course.thumbnail ? (
                                        <img
                                            src={course.thumbnail}
                                            alt={course.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <BookOpen className="h-16 w-16 text-white opacity-50" />
                                        </div>
                                    )}
                                    <div className="absolute top-3 right-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${course.isPublished ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'}`}>
                                            {course.isPublished ? 'Published' : 'Draft'}
                                        </span>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6">
                                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full mb-3">
                                        {course.categoryId.name}
                                    </span>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                                        {course.title}
                                    </h3>
                                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                        {course.description}
                                    </p>

                                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                                        <span>{course.enrollmentCount} students</span>
                                        <span className="font-semibold text-gray-900">
                                            {course.isFree ? 'Free' : `$${(course.price / 100).toFixed(2)}`}
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        <Link
                                            href={`/trainer/courses/${course._id}/manage`}
                                            className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                                        >
                                            Manage Course
                                        </Link>
                                        <button
                                            onClick={() => handleDeleteCourse(course._id, course.title)}
                                            className="w-full flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete Course
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
