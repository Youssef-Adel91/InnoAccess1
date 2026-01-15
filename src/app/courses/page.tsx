import Link from 'next/link';
import Image from 'next/image';
import { GraduationCap, Clock, Users, Star } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// NOTE: This page currently shows static UI only
// To connect to the API, you'll need to:
// 1. Make this a server component and fetch from API
// 2. OR use client-side fetching with useEffect
// For now, it shows empty state until courses are created via API

const sampleCourses: any[] = []; // Empty - no fake data

function formatPrice(cents: number): string {
    return `${(cents / 100).toFixed(0)} EGP`;
}

export default function CoursesPage() {
    return (
        <main id="main-content" className="min-h-screen bg-gray-50 py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Browse Courses</h1>
                    <p className="mt-2 text-gray-600">
                        Learn new skills with accessible courses featuring transcripts and keyboard controls
                    </p>
                </div>

                {/* Filters */}
                <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <form className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="flex-1 md:col-span-2">
                            <label htmlFor="search-courses" className="sr-only">
                                Search courses
                            </label>
                            <input
                                type="text"
                                id="search-courses"
                                placeholder="Search courses..."
                                className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-label="Search for courses"
                            />
                        </div>
                        <div>
                            <label htmlFor="category" className="sr-only">
                                Category
                            </label>
                            <select
                                id="category"
                                className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-label="Filter by category"
                            >
                                <option value="">All Categories</option>
                                <option value="programming">Programming</option>
                                <option value="design">Design</option>
                                <option value="marketing">Marketing</option>
                                <option value="data">Data Science</option>
                            </select>
                        </div>
                        <Button variant="primary" type="submit" className="w-full">
                            Search
                        </Button>
                    </form>
                </div>

                {/* Course Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sampleCourses.map((course) => (
                        <article
                            key={course.id}
                            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                        >
                            <div className="aspect-video bg-gray-200 relative">
                                <Image
                                    src={course.thumbnail}
                                    alt={course.title}
                                    fill
                                    className="object-cover"
                                />
                                <span className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                                    {formatPrice(course.price)}
                                </span>
                            </div>

                            <div className="p-6">
                                <div className="mb-2">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {course.category}
                                    </span>
                                </div>

                                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                                    <Link
                                        href={`/courses/${course.id}`}
                                        className="hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                                    >
                                        {course.title}
                                    </Link>
                                </h2>

                                <p className="text-sm text-gray-600 mb-4">by {course.instructor}</p>

                                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                                    <span className="flex items-center">
                                        <Star className="mr-1 h-4 w-4 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                                        {course.rating}
                                    </span>
                                    <span className="flex items-center">
                                        <Users className="mr-1 h-4 w-4" aria-hidden="true" />
                                        {course.students.toLocaleString()}
                                    </span>
                                    <span className="flex items-center">
                                        <Clock className="mr-1 h-4 w-4" aria-hidden="true" />
                                        {course.duration}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">{course.modules} modules</span>
                                    <Link href={`/courses/${course.id}`}>
                                        <Button variant="primary" size="sm">
                                            View Course
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>

                {/* Empty State */}
                {sampleCourses.length === 0 && (
                    <div className="text-center py-12">
                        <GraduationCap className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No courses found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Try adjusting your search filters
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}
