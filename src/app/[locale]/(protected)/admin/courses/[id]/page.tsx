import { getTranslations } from 'next-intl/server';
import { connectDB } from '@/lib/db';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';
import { UserRole } from '@/models/User';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ChevronLeft, Users, Calendar, Mail, GraduationCap } from 'lucide-react';
import { Types } from 'mongoose';

export const dynamic = 'force-dynamic';

export default async function AdminCourseAnalyticsPage({ params }: { params: { id: string, locale: string } }) {
    const t = await getTranslations('AdminCourseDetails');
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
        redirect('/dashboard');
    }

    if (!Types.ObjectId.isValid(params.id)) {
        notFound();
    }

    await connectDB();

    // 1. Fetch Course with Trainer details
    const course = await Course.findById(params.id)
        .populate('trainerId', 'name email')
        .lean() as any;

    if (!course) {
        notFound();
    }

    // 2. Fetch Enrollments with User details
    const enrollments = await Enrollment.find({ courseId: course._id })
        .populate('userId', 'name email')
        .sort({ enrolledAt: -1 })
        .lean() as any[];

    return (
        <main className="min-h-screen bg-gray-50 py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
                
                {/* Header Navigation */}
                <Link
                    href="/admin/courses"
                    className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    {t('backToCourses')}
                </Link>

                {/* Course Overview Header */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-8 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{course.title}</h1>
                        <div className="flex items-center gap-3 text-sm text-gray-600 mb-4">
                            <span className="flex items-center gap-1">
                                <GraduationCap className="h-4 w-4 text-blue-600" />
                                {t('trainer')}: <span className="font-medium text-gray-900">{course.trainerId?.name || t('unknownTrainer')}</span>
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${course.isPublished ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                                {course.isPublished ? t('statusPublished') : t('statusDraft')}
                            </span>
                        </div>
                    </div>

                    {/* Stats Card */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 min-w-[240px] flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-blue-800 mb-1">{t('totalEnrolled')}</p>
                            <p className="text-3xl font-bold text-blue-900">{course.enrollmentCount}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                            <Users className="h-6 w-6" />
                        </div>
                    </div>
                </div>

                {/* Trainees List Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-200 bg-gray-50/50">
                        <h3 className="text-lg font-semibold text-gray-900">{t('traineesList')}</h3>
                    </div>

                    {enrollments.length === 0 ? (
                        <div className="text-center py-16">
                            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">{t('noTrainees')}</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
                                        <th className="px-6 py-4 font-medium">{t('name')}</th>
                                        <th className="px-6 py-4 font-medium">{t('email')}</th>
                                        <th className="px-6 py-4 font-medium text-right">{t('enrolledDate')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm">
                                    {enrollments.map((enrollment) => (
                                        <tr key={enrollment._id.toString()} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{enrollment.userId?.name || t('unknownUser')}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center text-gray-600 gap-1.5">
                                                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                                                    {enrollment.userId?.email || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end text-gray-500 gap-1.5">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {new Date(enrollment.enrolledAt).toLocaleDateString()}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
