import { useTranslations } from "next-intl";

export default function AboutPage() {
    const t = useTranslations("About");

    return (
        <main id="main-content" className="min-h-screen bg-gray-50 py-16">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 md:p-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-6">{t("title")}</h1>

                    <div className="prose max-w-none">
                        <p className="text-lg text-gray-700 mb-6">
                            {t("intro")}
                        </p>

                        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">{t("missionTitle")}</h2>
                        <p className="text-gray-700 mb-6">
                            {t("missionText")}
                        </p>

                        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">{t("offerTitle")}</h2>
                        <ul className="list-disc list-inside text-gray-700 space-y-3 mb-6">
                            <li><strong>{t("jobBoard")}</strong> {t("offerJobs")}</li>
                            <li><strong>{t("professionalCourses")}</strong> {t("offerCourses")}</li>
                            <li><strong>{t("accessibilityFirst")}</strong> {t("offerAccessibility")}</li>
                            <li><strong>{t("communitySupport")}</strong> {t("offerCommunity")}</li>
                        </ul>

                        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">{t("valuesTitle")}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <div className="bg-blue-50 p-6 rounded-lg">
                                <h3 className="font-semibold text-blue-900 mb-2">{t("values.inclusivity")}</h3>
                                <p className="text-gray-700 text-sm">
                                    {t("values.inclusivityDesc")}
                                </p>
                            </div>
                            <div className="bg-green-50 p-6 rounded-lg">
                                <h3 className="font-semibold text-green-900 mb-2">{t("values.innovation")}</h3>
                                <p className="text-gray-700 text-sm">
                                    {t("values.innovationDesc")}
                                </p>
                            </div>
                            <div className="bg-purple-50 p-6 rounded-lg">
                                <h3 className="font-semibold text-purple-900 mb-2">{t("values.empowerment")}</h3>
                                <p className="text-gray-700 text-sm">
                                    {t("values.empowermentDesc")}
                                </p>
                            </div>
                            <div className="bg-yellow-50 p-6 rounded-lg">
                                <h3 className="font-semibold text-yellow-900 mb-2">{t("values.community")}</h3>
                                <p className="text-gray-700 text-sm">
                                    {t("values.communityDesc")}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
