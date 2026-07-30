'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useUser, useSession } from '@clerk/nextjs';
import { setUserRole, type UserRole } from '@/app/actions/userRole';
import {
    GraduationCap,
    Award,
    HeartHandshake,
    Building2,
    CheckCircle2,
    Loader2,
} from 'lucide-react';

interface RoleOption {
    id: UserRole;
    titleEn: string;
    titleAr: string;
    descEn: string;
    descAr: string;
    icon: React.ReactNode;
}

const ROLES: RoleOption[] = [
    {
        id: 'student',
        titleEn: 'Student / Learner',
        titleAr: 'طالب / متدرب',
        descEn: 'Access accessible courses, track your progress, and earn certificates.',
        descAr: 'الوصول لدورات تدريبية ميسرة، متابعة تقدمك، والحصول على شهادات.',
        icon: <GraduationCap className="w-8 h-8 text-blue-600" />,
    },
    {
        id: 'trainer',
        titleEn: 'Trainer / Instructor',
        titleAr: 'مدرب / محاضر',
        descEn: 'Publish courses, mentor learners, and earn revenue.',
        descAr: 'نشر دورات تدريبية، إرشاد المتدربين، وتحقيق الدخل.',
        icon: <Award className="w-8 h-8 text-purple-600" />,
    },
    {
        id: 'volunteer',
        titleEn: 'Volunteer / Mentor',
        titleAr: 'متطوع / مرشد',
        descEn: 'Provide mentorship, assist learners, and contribute to inclusivity.',
        descAr: 'تقديم الإرشاد للمتعلمين، والمساهمة في دعم ذوي الإعاقة.',
        icon: <HeartHandshake className="w-8 h-8 text-emerald-600" />,
    },
    {
        id: 'company',
        titleEn: 'Company / Employer',
        titleAr: 'شركة / جهة توظيف',
        descEn: 'Hire talent, sponsor accessible courses, and post job openings.',
        descAr: 'توظيف الكفاءات، رعاية الدورات التدريبية، ونشر فرص العمل.',
        icon: <Building2 className="w-8 h-8 text-amber-600" />,
    },
];

export default function OnboardingPage() {
    const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const locale = useLocale();
    const isAr = locale === 'ar';
    const { user } = useUser();
    const { session } = useSession();

    const handleContinue = async () => {
        if (!selectedRole) return;
        setIsLoading(true);
        setError('');

        try {
            await setUserRole(selectedRole);
            await user?.reload();
            await session?.getToken({ skipCache: true });

            const targetPath =
                selectedRole === 'student' ? '/dashboard' : `/${selectedRole}`;
            router.refresh();
            router.push(targetPath);
        } catch {
            setError(
                isAr
                    ? 'حدث خطأ أثناء حفظ اختيارك. حاول مرة أخرى.'
                    : 'Failed to save role. Please try again.'
            );
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl w-full bg-white rounded-3xl shadow-xl border border-gray-200/80 p-6 sm:p-10 transition-all">
                <div className="text-center mb-8">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                        {isAr ? 'مرحباً بك في InnoAccess' : 'Welcome to InnoAccess'}
                    </h1>
                    <p className="mt-2 text-base text-gray-600">
                        {isAr
                            ? 'الرجاء اختيار دورك في المنصة لنخصص تجربة الاستخدام المناسبة لك'
                            : 'Please select your role so we can personalize your experience'}
                    </p>
                </div>

                {error && (
                    <div
                        className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm text-center"
                        role="alert"
                    >
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    {ROLES.map((role) => {
                        const isSelected = selectedRole === role.id;
                        return (
                            <div
                                key={role.id}
                                onClick={() => !isLoading && setSelectedRole(role.id)}
                                className={`cursor-pointer rounded-2xl p-6 border-2 transition-all duration-200 flex flex-col justify-between ${
                                    isSelected
                                        ? 'border-blue-600 bg-blue-50/60 shadow-md ring-2 ring-blue-600/20'
                                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50/60'
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="p-3 rounded-xl bg-white shadow-sm border border-gray-100">
                                        {role.icon}
                                    </div>
                                    {isSelected && (
                                        <CheckCircle2 className="w-6 h-6 text-blue-600" />
                                    )}
                                </div>
                                <div className="mt-4">
                                    <h3 className="text-lg font-bold text-gray-900">
                                        {isAr ? role.titleAr : role.titleEn}
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                                        {isAr ? role.descAr : role.descEn}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-center">
                    <button
                        type="button"
                        onClick={handleContinue}
                        disabled={!selectedRole || isLoading}
                        className="w-full sm:w-auto min-w-[220px] px-8 py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
                    >
                        {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                        {isLoading
                            ? isAr
                                ? 'جاري الحفظ...'
                                : 'Saving...'
                            : isAr
                            ? 'متابعة'
                            : 'Continue'}
                    </button>
                </div>
            </div>
        </main>
    );
}
