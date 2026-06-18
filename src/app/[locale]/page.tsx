import Link from "next/link";
import { Briefcase, GraduationCap, Eye, Zap, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTranslations } from "next-intl";

export default function Home() {
    const t = useTranslations("Landing");
    const features = [
        {
            icon: Eye,
            title: t("features.screenReader.title"),
            description: t("features.screenReader.description"),
        },
        {
            icon: Briefcase,
            title: t("features.jobBoard.title"),
            description: t("features.jobBoard.description"),
        },
        {
            icon: GraduationCap,
            title: t("features.lms.title"),
            description: t("features.lms.description"),
        },
        {
            icon: Zap,
            title: t("features.navigation.title"),
            description: t("features.navigation.description"),
        },
        {
            icon: Shield,
            title: t("features.security.title"),
            description: t("features.security.description"),
        },
        {
            icon: Users,
            title: t("features.community.title"),
            description: t("features.community.description"),
        },
    ];

    const stats = [
        { value: "10,000+", label: t("stats.activeJobs") },
        { value: "500+", label: t("stats.coursesAvailable") },
        { value: "50,000+", label: t("stats.platformUsers") },
        { value: "1,000+", label: t("stats.companies") },
    ];

    return (
        <>
            {/* Hero Section */}
            <section
                id="main-content"
                className="relative bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white overflow-hidden"
                aria-labelledby="hero-heading"
            >
                {/* Decorative blobs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
                    <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
                    <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
                </div>

                <div className="relative mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-20 sm:py-28 md:py-36">
                    <div className="text-center">
                        <h1
                            id="hero-heading"
                            className="text-4xl font-extrabold tracking-tight leading-tight sm:text-5xl md:text-6xl lg:text-7xl"
                        >
                            {t("hero.heading")}
                            <span className="block mt-1 text-blue-200">{t("hero.headingAccent")}</span>
                        </h1>
                        <p className="mt-6 text-lg sm:text-xl leading-relaxed text-blue-100 max-w-3xl mx-auto">
                            {t("hero.description")}
                        </p>
                        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <Link href="/jobs" className="w-full sm:w-auto">
                                <Button
                                    size="lg"
                                    variant="secondary"
                                    className="w-full sm:w-auto bg-white text-blue-700 hover:bg-blue-50 hover:shadow-xl font-bold"
                                    aria-label={t("hero.findJobsLabel")}
                                >
                                    <Briefcase className="mr-2 h-5 w-5" aria-hidden="true" />
                                    {t("hero.findJobs")}
                                </Button>
                            </Link>
                            <Link href="/courses" className="w-full sm:w-auto">
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="w-full sm:w-auto border-white text-white hover:bg-white/10 hover:border-white/80 font-bold"
                                    aria-label={t("hero.browseCoursesLabel")}
                                >
                                    <GraduationCap className="mr-2 h-5 w-5" aria-hidden="true" />
                                    {t("hero.browseCourses")}
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Decorative wave */}
                <div className="absolute bottom-0 left-0 right-0" aria-hidden="true">
                    <svg
                        className="w-full h-12 sm:h-16 text-white"
                        preserveAspectRatio="none"
                        viewBox="0 0 1440 54"
                        fill="currentColor"
                    >
                        <path d="M0 22L120 16.7C240 11 480 1.00001 720 0.700012C960 1.00001 1200 11 1320 16.7L1440 22V54H1320C1200 54 960 54 720 54C480 54 240 54 120 54H0V22Z" />
                    </svg>
                </div>
            </section>

            {/* Stats Section */}
            <section className="bg-white py-12 sm:py-16" aria-labelledby="stats-heading">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <h2 id="stats-heading" className="sr-only">{t("stats.heading")}</h2>
                    <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
                        {stats.map((stat, index) => (
                            <div
                                key={index}
                                className="text-center p-5 sm:p-6 rounded-2xl bg-blue-50 border border-blue-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                            >
                                <div className="text-3xl sm:text-4xl font-extrabold text-blue-600">
                                    {stat.value}
                                </div>
                                <div className="mt-1.5 text-sm sm:text-base font-medium text-gray-600">{stat.label}</div>
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
                            className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900"
                        >
                            {t("features.heading")}
                        </h2>
                        <p className="mt-4 text-base sm:text-lg leading-relaxed text-gray-600 max-w-2xl mx-auto">
                            {t("features.subheading")}
                        </p>
                    </div>

                    <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {features.map((feature, index) => {
                            const Icon = feature.icon;
                            return (
                                <article
                                    key={index}
                                    className="bg-white rounded-2xl p-7 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-gray-100 group"
                                >
                                    <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-blue-600 text-white group-hover:bg-indigo-600 transition-colors duration-300">
                                        <Icon className="h-6 w-6" aria-hidden="true" />
                                    </div>
                                    <h3 className="mt-5 text-lg font-bold text-gray-900">
                                        {feature.title}
                                    </h3>
                                    <p className="mt-2 text-base leading-relaxed text-gray-600">{feature.description}</p>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section
                className="bg-gradient-to-br from-blue-700 to-indigo-700 text-white py-16 sm:py-24"
                aria-labelledby="cta-heading"
            >
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
                    <h2
                        id="cta-heading"
                        className="text-3xl sm:text-4xl font-extrabold tracking-tight"
                    >
                        {t("cta.heading")}
                    </h2>
                    <p className="mt-4 text-base sm:text-lg leading-relaxed text-blue-100 max-w-2xl mx-auto">
                        {t("cta.description")}
                    </p>
                    <div className="mt-8 flex justify-center">
                        <Link href="/auth/register" className="w-full sm:w-auto">
                            <Button
                                size="lg"
                                variant="secondary"
                                className="w-full sm:w-auto bg-white text-blue-700 hover:bg-blue-50 hover:shadow-xl font-bold"
                            >
                                {t("cta.createAccount")}
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>
        </>
    );
}
