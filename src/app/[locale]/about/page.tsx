export default function AboutPage() {
    return (
        <main id="main-content" className="min-h-screen bg-gray-50 py-16">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 md:p-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-6">About InnoAccess</h1>

                    <div className="prose max-w-none">
                        <p className="text-lg text-gray-700 mb-6">
                            InnoAccess is Egypt's premier inclusive platform connecting talented individuals with
                            opportunities in jobs, courses, and professional development.
                        </p>

                        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Our Mission</h2>
                        <p className="text-gray-700 mb-6">
                            We believe everyone deserves equal access to career opportunities and quality education.
                            Our mission is to break down barriers and create an inclusive ecosystem where talent meets
                            opportunity, regardless of background or circumstances.
                        </p>

                        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">What We Offer</h2>
                        <ul className="list-disc list-inside text-gray-700 space-y-3 mb-6">
                            <li><strong>Job Board:</strong> Connect with inclusive employers actively seeking diverse talent</li>
                            <li><strong>Professional Courses:</strong> Access recorded and live training from industry experts</li>
                            <li><strong>Accessibility First:</strong> Platform designed with universal accessibility in mind</li>
                            <li><strong>Community Support:</strong> Join a network of professionals committed to inclusive growth</li>
                        </ul>

                        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Our Values</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <div className="bg-blue-50 p-6 rounded-lg">
                                <h3 className="font-semibold text-blue-900 mb-2">Inclusivity</h3>
                                <p className="text-gray-700 text-sm">
                                    We champion diversity and ensure equal opportunities for all
                                </p>
                            </div>
                            <div className="bg-green-50 p-6 rounded-lg">
                                <h3 className="font-semibold text-green-900 mb-2">Innovation</h3>
                                <p className="text-gray-700 text-sm">
                                    We leverage technology to create meaningful connections
                                </p>
                            </div>
                            <div className="bg-purple-50 p-6 rounded-lg">
                                <h3 className="font-semibold text-purple-900 mb-2">Empowerment</h3>
                                <p className="text-gray-700 text-sm">
                                    We provide tools and resources for professional growth
                                </p>
                            </div>
                            <div className="bg-yellow-50 p-6 rounded-lg">
                                <h3 className="font-semibold text-yellow-900 mb-2">Community</h3>
                                <p className="text-gray-700 text-sm">
                                    We build supportive networks that foster collaboration
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
