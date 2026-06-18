import { Briefcase, GraduationCap, Users, Zap, Shield, Video } from 'lucide-react';
import Link from 'next/link';

export default function FeaturesPage() {
    const features = [
        {
            icon: Briefcase,
            title: 'Inclusive Job Board',
            description: 'Connect with employers committed to diversity and accessibility',
            color: 'bg-blue-500',
        },
        {
            icon: GraduationCap,
            title: 'Professional Courses',
            description: 'Access recorded courses and live workshops from industry experts',
            color: 'bg-green-500',
        },
        {
            icon: Video,
            title: 'Live Workshops',
            description: 'Join interactive Zoom sessions with real-time Q&A and networking',
            color: 'bg-red-500',
        },
        {
            icon: Users,
            title: 'Community Network',
            description: 'Connect with like-minded professionals and mentors',
            color: 'bg-purple-500',
        },
        {
            icon: Shield,
            title: 'Verified Companies',
            description: 'All companies undergo verification to ensure legitimacy',
            color: 'bg-yellow-600',
        },
        {
            icon: Zap,
            title: 'Real-time Notifications',
            description: 'Stay updated on applications, new courses, and opportunities',
            color: 'bg-indigo-500',
        },
    ];

    return (
        <main id="main-content" className="min-h-screen bg-gray-50 py-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        Platform Features
                    </h1>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        Everything you need to advance your career and skills in one inclusive platform
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
                    <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
                    <p className="text-xl mb-8 opacity-90">
                        Join thousands of professionals already using InnoAccess
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/auth/register"
                            className="inline-flex items-center justify-center px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                        >
                            Sign Up Free
                        </Link>
                        <Link
                            href="/auth/signin"
                            className="inline-flex items-center justify-center px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                        >
                            Sign In
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
