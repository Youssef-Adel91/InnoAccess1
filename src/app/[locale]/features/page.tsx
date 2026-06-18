import { Briefcase, GraduationCap, Users, Zap, Shield, Video } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function FeaturesPage() {
    const t = useTranslations('Features');
    const features = [
        {
            icon: Briefcase,
            title: t('list.jobsTitle'),
            description: t('list.jobsDesc'),
            color: 'bg-blue-500',
        },
        {
            icon: GraduationCap,
            title: t('list.coursesTitle'),
            description: t('list.coursesDesc'),
            color: 'bg-green-500',
        },
        {
            icon: Video,
            title: t('list.workshopsTitle'),
            description: t('list.workshopsDesc'),
            color: 'bg-red-500',
        },
        {
            icon: Users,
            title: t('list.networkTitle'),
            description: t('list.networkDesc'),
            color: 'bg-purple-500',
        },
        {
            icon: Shield,
            title: t('list.verifiedTitle'),
            description: t('list.verifiedDesc'),
            color: 'bg-yellow-600',
        },
        {
            icon: Zap,
            title: t('list.notificationsTitle'),
            description: t('list.notificationsDesc'),
            color: 'bg-indigo-500',
        },
    ];

    return (
        <main id="main-content" className="min-h-screen bg-gray-50 py-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        {t('title')}
                    </h1>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        {t('subtitle')}
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                    {features.map((feature) => {
                        const Icon = feature.icon;
                        return (
                            <div
                                key={feature.title}
                                className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 hover:shadow-md transition-shadow"
                            >
                                <div className={`${feature.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                                    <Icon className="h-6 w-6 text-white" aria-hidden="true" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-600">
                                    {feature.description}
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* CTA Section */}
                <div className="bg-blue-600 rounded-lg shadow-xl p-12 text-center text-white">
                    <h2 className="text-3xl font-bold mb-4">{t('cta.title')}</h2>
                    <p className="text-xl mb-8 opacity-90">
                        {t('cta.subtitle')}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/auth/register"
                            className="inline-flex items-center justify-center px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                        >
                            {t('cta.signUp')}
                        </Link>
                        <Link
                            href="/auth/signin"
                            className="inline-flex items-center justify-center px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                        >
                            {t('cta.signIn')}
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
