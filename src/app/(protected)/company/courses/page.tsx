'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCreatorCourses } from '@/app/actions/courseManagement';
import { Plus, BookOpen, Users, Video, Trash2 } from 'lucide-react';

interface Course {
    _id: string;
    title: string;
    description: string;
    categoryId: { name: string; slug: string };
    isFree: boolean;
    price: number;
    thumbnail?: string;
    enrollmentCount: number;
    isPublished: boolean;
    modules: any[];
}

export default function CompanyCoursesDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (status === 'loading') return;
        if (!session || session.user.role !== 'company') router.push('/');
    }, [session, status, router]);

    useEffect(() => {
        if (session?.user.role === 'company') fetchCourses();
    }, [session]);

    const fetchCourses = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await getCreatorCourses();
            if (!result.success) throw new Error(result.error?.message || 'Failed to fetch courses');
            setCourses(result.data?.courses || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (courseId: string, title: string) => {
        if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
        try {
            const res = await fetch(`/api/courses/${courseId}`, { method: 'DELETE' });
            const data = await res.json();
            if (!data.success) throw new Error(data.error?.message || 'Failed to delete');
            await fetchCourses();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const stats = {
        total: courses.length,
        published: courses.filter(c => c.isPublished).length,
        students: courses.reduce((s, c) => s + (c.enrollmentCount || 0), 0),
        lessons: courses.reduce((s, c) => s + c.modules.reduce((ms: number, m: any) => ms + (m.videos?.length || 0), 0), 0),
    };

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
                    <p className="mt-4 text-gray-600">Loading courses…</p>
                </div>
            </div>
        );
    }

    if (!session || session.user.role !== 'company') return null;

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
                        <p className="mt-1 text-gray-600">Manage training content published by {session.user.name}</p>
                    </div>
                    <Link
                        href="/company/courses/new"
                        className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="h-5 w-5 mr-2" aria-hidden="true" />
                        Create Course
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Total Courses', value: stats.total, icon: BookOpen, color: 'text-blue-600' },
                        { label: 'Published', value: stats.published, icon: BookOpen, color: 'text-green-600' },
                        { label: 'Total Students', value: stats.students, icon: Users, color: 'text-purple-600' },
                        { label: 'Total Lessons', value: stats.lessons, icon: Video, color: 'text-orange-600' },
                    ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="bg-white rounded-lg shadow p-5 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">{label}</p>
                                <p className="text-2xl font-bold text-gray-900">{value}</p>
                            </div>
                            <Icon className={`h-10 w-10 ${color}`} aria-hidden="true" />
                        </div>
                    ))}
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-800">{error}</p>
                    </div>
                )}

                {/* Course Grid */}
                {courses.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-md p-12 text-center">
                        <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" aria-hidden="true" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No courses yet</h3>
                        <p className="text-gray-500 mb-6">Start creating training content for your team or the public</p>
                        <Link
                            href="/company/courses/new"
                            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="h-5 w-5 mr-2" aria-hidden="true" />
                            Create First Course
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map((course) => (
                            <div key={course._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                                {/* Thumbnail */}
                                <div className="h-44 bg-gradient-to-br from-blue-500 to-indigo-600 relative">
                                    {course.thumbnail ? (
                                        <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <BookOpen className="h-14 w-14 text-white opacity-40" aria-hidden="true" />
                                        </div>
                                    )}
                                    <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${course.isPublished ? 'bg-green-500 text-white' : 'bg-yellow-400 text-gray-900'}`}>
                                        {course.isPublished ? 'Published' : 'Draft'}
                                    </span>
                                </div>

                                {/* Content */}
                                <div className="p-5">
                                    <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full mb-2">
                                        {course.categoryId?.name}
                                    </span>
                                    <h3 className="text-base font-bold text-gray-900 mb-1 line-clamp-2">{course.title}</h3>
                                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{course.description}</p>
                                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                                        <span>{course.enrollmentCount} enrolled</span>
                                        <span className="font-semibold text-gray-800">
                                            {course.isFree ? 'Free' : `$${(course.price / 100).toFixed(2)}`}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        <Link
                                            href={`/trainer/courses/${course._id}/manage`}
                                            className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                                        >
                                            Manage Course
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(course._id, course.title)}
                                            className="w-full flex items-center justify-center bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                                            aria-label={`Delete course: ${course.title}`}
                                        >
                                            <Trash2 className="h-4 w-4 mr-1.5" aria-hidden="true" />
                                            Delete
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
