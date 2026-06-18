'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { TrainerRequestCard } from '@/components/admin/TrainerRequestCard';

interface TrainerApplication {
    _id: string;
    userId: {
        _id: string;
        name: string;
        email: string;
    };
    bio: string;
    linkedInUrl?: string;
    websiteUrl?: string;
    cvUrl: string;
    specialization: string;
    createdAt: Date;
}

export default function TrainerRequestsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [applications, setApplications] = useState<TrainerApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Check if user is admin
    useEffect(() => {
        if (status === 'loading') return;

        if (!session || session.user.role !== 'admin') {
            router.push('/');
        }
    }, [session, status, router]);

    // Fetch pending applications
    const fetchApplications = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/admin/trainer-requests');
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error?.message || 'Failed to fetch applications');
            }

            setApplications(data.data.applications);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session?.user.role === 'admin') {
            fetchApplications();
        }
    }, [session]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!session || session.user.role !== 'admin') {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-100 py-8">
            <div className="max-w-6xl mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Trainer Application Requests
                    </h1>
                    <p className="text-gray-600">
                        Review and approve/reject trainer applications from users.
                    </p>
                </div>

                {/* Stats Bar */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                {applications.length}
                            </h2>
                            <p className="text-gray-600">Pending Applications</p>
                        </div>
                        <div className="text-4xl">📋</div>
                    </div>
                </div>

                {/* Refresh Button */}
                <div className="mb-6">
                    <button
                        onClick={fetchApplications}
                        disabled={loading}
                        className="bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? 'Loading...' : '🔄 Refresh'}
                    </button>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading applications...</p>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-800">{error}</p>
                    </div>
                )}

                {/* Empty State */}
                {!loading && applications.length === 0 && (
                    <div className="bg-white rounded-lg shadow-md p-12 text-center">
                        <div className="text-6xl mb-4">✅</div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            No Pending Applications
                        </h3>
                        <p className="text-gray-600">
                            All trainer applications have been reviewed.
                        </p>
                    </div>
                )}

                {/* Application Cards */}
                {!loading && applications.length > 0 && (
                    <div>
                        {applications.map((application) => (
                            <TrainerRequestCard
                                key={application._id}
                                application={application}
                                onStatusUpdate={fetchApplications}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
