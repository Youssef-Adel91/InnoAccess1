import Link from "next/link";
import { Briefcase, GraduationCap, Eye, Zap, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function Home() {
    const features = [
        {
            icon: Eye,
            title: "Screen Reader Optimized",
            description: "Full NVDA, JAWS, and VoiceOver compatibility with WCAG 2.1 AAA standards",
        },
        {
            icon: Briefcase,
            title: "Accessible Job Board",
            description: "Find inclusive job opportunities with detailed accessibility features",
        },
        {
            icon: GraduationCap,
            title: "Learning Platform",
            description: "Professional courses with transcripts and keyboard-accessible video players",
        },
        {
            icon: Zap,
            title: "Easy Navigation",
            description: "Keyboard-only navigation, skip links, and logical focus management",
        },
        {
            icon: Shield,
            title: "Secure & Private",
            description: "Your data is protected with industry-standard security measures",
        },
        {
            icon: Users,
            title: "Inclusive Community",
            description: "Connect with employers and trainers who value accessibility",
        },
    ];

    const stats = [
        { value: "10,000+", label: "Active Jobs" },
        { value: "500+", label: "Courses Available" },
        { value: "50,000+", label: "Platform Users" },
        { value: "1,000+", label: "Companies" },
    ];

    return (
        <>
            {/* Hero Section */}
            <section
                id="main-content"
                className="relative bg-gradient-to-br from-blue-600 to-blue-800 text-white"
                aria-labelledby="hero-heading"
            >
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
                    <div className="text-center">
                        <h1
                            id="hero-heading"
                            className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
                        >
                            Empowering Careers Through
                            <span className="block text-blue-200">Accessible Opportunities</span>
                        </h1>
                        <p className="mt-6 text-lg sm:text-xl text-blue-100 max-w-3xl mx-auto">
                            InnoAccess is Egypt's first fully accessible job board and learning platform,
                            designed for visually impaired individuals with complete screen reader support.
                        </p>
                        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/jobs">
                                <Button
                                    size="lg"
                                    variant="secondary"
                                    className="w-full sm:w-auto bg-white text-blue-600 hover:bg-blue-50"
                                    aria-label="Browse available jobs"
                                >
                                    <Briefcase className="mr-2 h-5 w-5" aria-hidden="true" />
                                    Find Jobs
                                </Button>
                            </Link>
                            <Link href="/courses">
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="w-full sm:w-auto border-white text-white hover:bg-white/10"
                                    aria-label="Explore available courses"
                                >
                                    <GraduationCap className="mr-2 h-5 w-5" aria-hidden="true" />
                                    Browse Courses
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Decorative wave */}
                <div className="absolute bottom-0 left-0 right-0">
                    <svg
                        className="w-full h-12 sm:h-16 text-white"
                        preserveAspectRatio="none"
                        viewBox="0 0 1440 54"
                        fill="currentColor"
                        aria-hidden="true"
                    >
                        <path d="M0 22L120 16.7C240 11 480 1.00001 720 0.700012C960 1.00001 1200 11 1320 16.7L1440 22V54H1320C1200 54 960 54 720 54C480 54 240 54 120 54H0V22Z" />
                    </svg>
                </div>
            </section>

            {/* Stats Section */}
            <section className="bg-white py-12 sm:py-16" aria-labelledby="stats-heading">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <h2 id="stats-heading" className="sr-only">
                        Platform Statistics
                    </h2>
                    <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
                        {stats.map((stat, index) => (
                            <div
                                key={index}
                                className="text-center p-6 rounded-lg bg-blue-50 border border-blue-200"
                            >
                                <div className="text-3xl sm:text-4xl font-bold text-blue-600">
                                    {stat.value}
                                </div>
                                <div className="mt-2 text-sm sm:text-base text-gray-600">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section
                className="bg-gray-50 py-16 sm:py-24"
                aria-labelledby="features-heading"
            >
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <h2
                            id="features-heading"
                            className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
                        >
                            Built for Accessibility
                        </h2>
                        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
                            Every feature is designed with accessibility in mind, ensuring a seamless
                            experience for all users.
                        </p>
                    </div>

                    <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                        {features.map((feature, index) => {
                            const Icon = feature.icon;
                            return (
                                <article
                                    key={index}
                                    className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-200"
                                >
                                    <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                                        <Icon className="h-6 w-6" aria-hidden="true" />
                                    </div>
                                    <h3 className="mt-4 text-lg font-semibold text-gray-900">
                                        {feature.title}
                                    </h3>
                                    <p className="mt-2 text-gray-600">{feature.description}</p>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section
                className="bg-blue-600 text-white py-16 sm:py-20"
                aria-labelledby="cta-heading"
            >
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
                    <h2
                        id="cta-heading"
                        className="text-3xl font-bold tracking-tight sm:text-4xl"
                    >
                        Ready to Get Started?
                    </h2>
                    <p className="mt-4 text-lg text-blue-100 max-w-2xl mx-auto">
                        Join thousands of users who are finding jobs and learning new skills on
                        InnoAccess.
                    </p>
                    <div className="mt-8">
                        <Link href="/auth/register">
                            <Button
                                size="lg"
                                variant="secondary"
                                className="bg-white text-blue-600 hover:bg-blue-50"
                            >
                                Create Free Account
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>
        </>
    );
}
