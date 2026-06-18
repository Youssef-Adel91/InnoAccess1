import { getTranslations } from 'next-intl/server';
import { connectDB } from '@/lib/db';
import User, { UserRole } from '@/models/User';
import TrainerProfile from '@/models/TrainerProfile';
import Course from '@/models/Course';
import Image from 'next/image';
import { UserCircle, FileText, Briefcase, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminTrainersDirectoryPage() {
    const t = await getTranslations('AdminTrainers');
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
        redirect('/dashboard');
    }

    await connectDB();

    // Fetch users with role TRAINER
    const users = await User.find({ role: UserRole.TRAINER }).lean();

    // Fetch their trainer profiles to get specialization and CV
    const userIds = users.map((u) => u._id);
    const profiles = await TrainerProfile.find({ userId: { $in: userIds } }).lean();

    // Map profiles by userId for O(1) lookup
    const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

    // Fetch courses associated with these trainers
    const courses = await Course.find({ trainerId: { $in: userIds } }).select('title trainerId').lean();
    
    // Group courses by trainerId
    const courseMap = new Map<string, any[]>();
    courses.forEach((course: any) => {
        const tId = course.trainerId.toString();
        if (!courseMap.has(tId)) {
            courseMap.set(tId, []);
        }
        courseMap.get(tId)!.push(course);
    });

    const trainers = users.map((user) => {
        const profile = profileMap.get(user._id.toString());
        const tCourses = courseMap.get(user._id.toString()) || [];
        return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            avatar: user.profile?.avatar || null,
            specialization: profile?.specialization || t('fallbackSpecialization'),
            cvUrl: profile?.cvUrl || null,
            courses: tCourses,
        };
    });

    return (
        <main className="min-h-screen bg-gray-50 py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <Link
                            href="/admin"
                            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-1"
                        >
                            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                            {t('backToAdmin')}
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
                        <p className="mt-2 text-gray-600">
                            {t('subtitle')}
                        </p>
                    </div>
                </div>

                {/* Trainers Grid */}
                {trainers.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
                        <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('noTrainers')}</h3>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {trainers.map((trainer) => (
                            <div key={trainer.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col items-center text-center hover:shadow-md transition-shadow">
                                <div className="mb-4 relative w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-blue-100">
                                    {trainer.avatar ? (
                                        <Image
                                            src={trainer.avatar}
                                            alt={trainer.name}
                                            fill
                                            className="object-cover"
                                            sizes="96px"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                                            <UserCircle className="w-16 h-16" />
                                        </div>
                                    )}
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 mb-1 line-clamp-1">{trainer.name}</h2>
                                <p className="text-sm font-medium text-blue-600 mb-3 line-clamp-1">{trainer.specialization}</p>
                                
                                {/* Courses Taught Section */}
                                <div className="w-full text-center mb-4">
                                    <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('coursesTaught')}</h4>
                                    {trainer.courses.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5 justify-center">
                                            {trainer.courses.slice(0, 3).map((course: any) => (
                                                <span key={course._id.toString()} className="inline-block px-2 py-1 bg-gray-50 text-gray-700 text-xs rounded-md border border-gray-200 line-clamp-1 max-w-[140px]" title={course.title}>
                                                    {course.title}
                                                </span>
                                            ))}
                                            {trainer.courses.length > 3 && (
                                                <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-100">
                                                    +{trainer.courses.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 italic">{t('noCoursesYet')}</p>
                                    )}
                                </div>

                                <p className="text-sm text-gray-500 mb-6 line-clamp-1 mt-auto">{trainer.email}</p>

                                <div className="mt-auto w-full">
                                    {trainer.cvUrl ? (
                                        <a
                                            href={trainer.cvUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                                            aria-label={`${t('viewCV')} ${trainer.name}`}
                                        >
                                            <FileText className="w-4 h-4 mr-2" />
                                            {t('viewCV')}
                                        </a>
                                    ) : (
                                        <button
                                            disabled
                                            className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-200 rounded-lg shadow-sm text-sm font-medium text-gray-400 bg-gray-50 cursor-not-allowed"
                                        >
                                            {t('noCV')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
