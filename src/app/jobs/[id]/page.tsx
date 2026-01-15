'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { MapPin, Briefcase, DollarSign, Clock, Building2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import CVUploadDialog from '@/components/jobs/CVUploadDialog';

interface Job {
    _id: string;
    title: string;
    description: string;
    requirements: string[];
    companyId: {
        _id: string;
        name: string;
        profile?: {
            companyLogo?: string;
            companyName?: string;
            accessibilityScore?: number;
        };
    };
    salary: {
        min: number;
        max: number;
        currency: string;
    };
    location: string;
    type: string;
    accessibilityFeatures: string[];
    createdAt: string;
}

export default function JobDetailsPage() {
    const params = useParams();
    const { data: session } = useSession();
    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);
    const [applied, setApplied] = useState(false);
    const [showCVDialog, setShowCVDialog] = useState(false);

    useEffect(() => {
        async function fetchJob() {
            try {
                const response = await fetch(`/api/jobs/${params.id}`);
                const data = await response.json();

                if (data.success) {
                    setJob(data.data.job);
                }
            } catch (error) {
                console.error('Failed to fetch job:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchJob();
    }, [params.id]);

    const handleApply = () => {
        if (!session) {
            window.location.href = '/auth/signin';
            return;
        }
        setShowCVDialog(true);
    };

    const handleSubmitApplication = async (cvUrl: string, coverLetter?: string) => {
        try {
            const response = await fetch(`/api/jobs/${params.id}/apply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cvUrl,
                    coverLetter,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setApplied(true);
                setShowCVDialog(false);
                alert('Application submitted successfully!');
            } else {
                throw new Error(data.error?.message || 'Failed to apply');
            }
        } catch (error: any) {
            console.error('Application error:', error);
            alert(error.message || 'An error occurred while submitting your application');
            throw error;
        }
    };

    if (loading) {
        return (
            <main id="main-content" className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading job details...</p>
                </div>
            </main>
        );
    }

    if (!job) {
        return (
            <main id="main-content" className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900">Job Not Found</h1>
                    <p className="mt-2 text-gray-600">The job you&apos;re looking for doesn&apos;t exist.</p>
                    <Link href="/jobs" className="mt-4 inline-block">
                        <Button>Browse All Jobs</Button>
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main id="main-content" className="min-h-screen bg-gray-50 py-8">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                {/* Back Button */}
                <Link
                    href="/jobs"
                    className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                >
                    ← Back to Jobs
                </Link>

                {/* Job Header */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
                            <div className="mt-4 flex flex-wrap gap-4 text-gray-600">
                                <span className="flex items-center">
                                    <Building2 className="mr-2 h-5 w-5" aria-hidden="true" />
                                    {job.companyId.profile?.companyName || job.companyId.name}
                                </span>
                                <span className="flex items-center">
                                    <MapPin className="mr-2 h-5 w-5" aria-hidden="true" />
                                    {job.location}
                                </span>
                                <span className="flex items-center">
                                    <Briefcase className="mr-2 h-5 w-5" aria-hidden="true" />
                                    {job.type}
                                </span>
                                <span className="flex items-center">
                                    <DollarSign className="mr-2 h-5 w-5" aria-hidden="true" />
                                    {job.salary.min.toLocaleString()} - {job.salary.max.toLocaleString()} {job.salary.currency}
                                </span>
                                <span className="flex items-center">
                                    <Clock className="mr-2 h-5 w-5" aria-hidden="true" />
                                    Posted {new Date(job.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        <div className="mt-4 sm:mt-0 sm:ml-6">
                            {applied ? (
                                <div className="flex items-center text-green-600 bg-green-50 px-6 py-3 rounded-md">
                                    <CheckCircle className="mr-2 h-5 w-5" aria-hidden="true" />
                                    Applied
                                </div>
                            ) : (
                                <Button
                                    onClick={handleApply}
                                    size="lg"
                                    variant="primary"
                                    disabled={!session || session.user.role !== 'user' || applied}
                                >
                                    Apply Now
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Accessibility Features */}
                {job.accessibilityFeatures.length > 0 && (
                    <div className="mt-6 bg-green-50 rounded-lg border border-green-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-3">
                            Accessibility Features
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {job.accessibilityFeatures.map((feature, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                                >
                                    <CheckCircle className="mr-1 h-4 w-4" aria-hidden="true" />
                                    {feature}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Job Description */}
                <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Description</h2>
                    <div className="prose max-w-none text-gray-700 whitespace-pre-line">
                        {job.description}
                    </div>
                </div>

                {/* Requirements */}
                <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Requirements</h2>
                    <ul className="space-y-2">
                        {job.requirements.map((req, index) => (
                            <li key={index} className="flex items-start">
                                <CheckCircle className="mr-2 h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                                <span className="text-gray-700">{req}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Apply Section */}
                {!applied && (
                    <div className="mt-6 bg-blue-50 rounded-lg border border-blue-200 p-6 text-center">
                        {!session ? (
                            <>
                                <p className="text-gray-700 mb-4">
                                    Sign in to apply for this job
                                </p>
                                <Link href="/auth/signin">
                                    <Button size="lg">Sign In</Button>
                                </Link>
                            </>
                        ) : session.user.role !== 'user' ? (
                            <p className="text-gray-700">
                                Only job seekers can apply for jobs
                            </p>
                        ) : (
                            <>
                                <p className="text-gray-700 mb-4">
                                    Ready to apply?
                                </p>
                                <Button
                                    onClick={handleApply}
                                    size="lg"
                                    variant="primary"
                                >
                                    Submit Application
                                </Button>
                            </>
                        )}
                    </div>
                )}

                {/* CV Upload Dialog */}
                <CVUploadDialog
                    isOpen={showCVDialog}
                    onClose={() => setShowCVDialog(false)}
                    onSubmit={handleSubmitApplication}
                />
            </div>
        </main>
    );
}
