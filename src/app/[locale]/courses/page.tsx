'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GraduationCap, Clock, Users, Star, BookOpen, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/Button';

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
    };
    isFree: boolean;
    price: number;
    originalPrice?: number;
    thumbnail?: string;
    enrollmentCount: number;
    rating: number;
    modules: any[];
    courseType?: 'RECORDED' | 'LIVE';
    liveSession?: {
        startDate: string | Date;
        durationMinutes: number;
    };
}

function formatPrice(cents: number): string {
    return `${(cents / 100).toFixed(0)} EGP`;
}

export default function CoursesPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter state
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [priceFilter, setPriceFilter] = useState<string>('all'); // 'all', 'free', 'paid'

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchCourses();
    }, [selectedCategory, priceFilter]);

    const fetchCategories = async () => {
        try {
            const response = await fetch('/api/categories');
            const result = await response.json();

            if (result.success) {
                setCategories(result.data?.categories || []);
            }
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        }
    };

    const fetchCourses = async () => {
        setLoading(true);
        try {
            // Build query params
            const params = new URLSearchParams();
            if (selectedCategory !== 'all') {
                params.append('category', selectedCategory);
            }

            const response = await fetch(`/api/courses?${params.toString()}`);
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to fetch courses');
            }

            let fetchedCourses = result.data?.courses || [];

            // Apply price filter client-side
            if (priceFilter === 'free') {
                fetchedCourses = fetchedCourses.filter((c: Course) => c.isFree);
            } else if (priceFilter === 'paid') {
                fetchedCourses = fetchedCourses.filter((c: Course) => !c.isFree);
            }

            setCourses(fetchedCourses);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading courses...</p>
                </div>
            </main>
        );
    }

    return (
        <main id="main-content" className="min-h-screen bg-gray-50 py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Browse Courses</h1>
                    <p className="mt-2 text-base leading-relaxed text-gray-600">
                        Learn new skills with accessible courses featuring transcripts and keyboard controls
                    </p>
                </div>

                {/* Filters */}
                <div className="mb-6 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {/* Category Filter */}
                        <div>
                            <label htmlFor="category" className="block text-sm font-semibold text-gray-700 mb-2">
                                Category
                            </label>
                            <select
                                id="category"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base min-h-[44px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                            >
                                <option value="all">All Categories</option>
                                {categories.map((cat) => (
                                    <option key={cat._id} value={cat._id}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Price Filter */}
                        <div>
                            <label htmlFor="price" className="block text-sm font-semibold text-gray-700 mb-2">
                                Price
                            </label>
                            <select
                                id="price"
                                value={priceFilter}
                                onChange={(e) => setPriceFilter(e.target.value)}
                                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base min-h-[44px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                            >
                                <option value="all">All Courses</option>
                                <option value="free">Free Only</option>
                                <option value="paid">Paid Only</option>
                            </select>
                        </div>

                        {/* Reset Button */}
                        <div className="flex items-end">
                            <button
                                onClick={() => {
                                    setSelectedCategory('all');
                                    setPriceFilter('all');
                                }}
                                className="w-full min-h-[44px] px-4 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 hover:shadow-md transition-all duration-200 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-600 focus-visible:ring-offset-2"
                            >
                                Reset Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-800">{error}</p>
                    </div>
                )}

                {/* Course Grid */}
                {courses.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                        {courses.map((course) => (
                            <article
                                key={course._id}
                                className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 group"
                            >
                                {/* Thumbnail */}
                                <div className="h-48 bg-gradient-to-br from-blue-service to-purple-600 relative">
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
                                    {course.courseType === 'LIVE' && course.liveSession ? (() => {
                                        const { getSessionState, getLiveBadge } = require('@/lib/sessionUtils');
                                        const state = getSessionState(course.liveSession.startDate, course.liveSession.durationMinutes);
                                        const badge = getLiveBadge(state);
                                        return (
                                            <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 ${badge.className}`}>
                                                {badge.emoji} {badge.text}
                                            </span>
                                        );
                                    })() : null}
                                    <span className="absolute top-3 right-3 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2">
                                        {course.isFree ? (
                                            <span>Free</span>
                                        ) : (
                                            <>
                                                {course.originalPrice && course.originalPrice > course.price && (
                                                    <span className="line-through text-blue-200 text-xs">
                                                        {formatPrice(course.originalPrice)}
                                                    </span>
                                                )}
                                                <span>{formatPrice(course.price)}</span>
                                            </>
                                        )}
                                    </span>
                                </div>

                                {/* Content */}
                                <div className="p-6">
                                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full mb-3">
                                        {course.categoryId.name}
                                    </span>

                                    <h2 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                                        {course.title}
                                    </h2>

                                    <p className="text-sm text-gray-600 mb-2">by {course.trainerId.name}</p>

                                    <p className="text-gray-700 text-sm mb-4 line-clamp-2">
                                        {course.description}
                                    </p>

                                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                                        <span className="flex items-center">
                                            <Star className="mr-1 h-4 w-4 fill-yellow-400 text-yellow-400" />
                                            {course.rating || 0}
                                        </span>
                                        <span className="flex items-center">
                                            <Users className="mr-1 h-4 w-4" />
                                            {course.enrollmentCount || 0}
                                        </span>
                                        {course.courseType === 'LIVE' && course.liveSession ? (
                                            <span className="flex items-center text-red-600 font-medium">
                                                <Calendar className="mr-1 h-4 w-4" />
                                                {new Date(course.liveSession.startDate).toLocaleDateString()}
                                            </span>
                                        ) : (
                                            <span className="flex items-center">
                                                <BookOpen className="mr-1 h-4 w-4" />
                                                {course.modules?.length || 0} modules
                                            </span>
                                        )}
                                    </div>

                                    <Link href={`/courses/${course._id}`}>
                                        <Button variant="primary" className="w-full min-h-[44px]">
                                            {course.courseType === 'LIVE' ? 'View Workshop' : 'View Course'}
                                        </Button>
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    /* Empty State */
                    <div className="text-center py-12 bg-white rounded-lg shadow-md">
                        <GraduationCap className="mx-auto h-16 w-16 text-gray-400" />
                        <h3 className="mt-4 text-lg font-semibold text-gray-900">No courses available yet</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            Check back later for new courses
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}
