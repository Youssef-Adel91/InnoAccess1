'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
    Clock, CheckCircle, XCircle, Eye, Star,
    MapPin, Briefcase, Calendar, FileText
} from 'lucide-react';

interface Application {
    _id: string;
    jobId: {
        _id: string;
        title: string;
        companyId: {
            name: string;
            profile?: { companyName?: string };
        };
        location: string;
        type: string;
    };
    status: 'pending' | 'viewed' | 'shortlisted' | 'rejected' | 'accepted';
    cvUrl: string;
    coverLetter?: string;
    appliedAt: string;
}

// Status configuration with text labels and icons for accessibility
const statusConfig = {
    pending: {
        label: 'Pending Review',
        icon: Clock,
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-800',
        borderColor: 'border-yellow-200',
        iconColor: 'text-yellow-600',
    },
    viewed: {
        label: 'Viewed by Company',
        icon: Eye,
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-800',
        borderColor: 'border-blue-200',
        iconColor: 'text-blue-600',
    },
    shortlisted: {
        label: 'Shortlisted',
        icon: Star,
        bgColor: 'bg-purple-50',
        textColor: 'text-purple-800',
        borderColor: 'border-purple-200',
        iconColor: 'text-purple-600',
    },
    accepted: {
        label: 'Accepted',
        icon: CheckCircle,
        bgColor: 'bg-green-50',
        textColor: 'text-green-800',
        borderColor: 'border-green-200',
        iconColor: 'text-green-600',
    },
    rejected: {
        label: 'Not Selected',
        icon: XCircle,
        bgColor: 'bg-red-50',
        textColor: 'text-red-800',
        borderColor: 'border-red-200',
        iconColor: 'text-red-600',
    },
};

export default function UserApplicationsPage() {
    const { data: session, status: sessionStatus } = useSession();
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');

    useEffect(() => {
        if (sessionStatus === 'unauthenticated' || (session && session.user.role !== 'user')) {
            redirect('/dashboard');
        }

        if (sessionStatus === 'authenticated' && session.user.role === 'user') {
            fetchApplications();
        }
    }, [sessionStatus, session, filter]);

    const fetchApplications = async () => {
        try {
            const queryParams = filter !== 'all' ? `?status=${filter}` : '';
            const response = await fetch(`/api/user/applications${queryParams}`);
            const data = await response.json();

            if (data.success) {
                setApplications(data.data.applications);
            }
        } catch (error) {
            console.error('Failed to fetch applications:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <main id="main-content" className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
                    <p className="mt-4 text-gray-600">Loading applications...</p>
                </div>
            </main>
        );
    }

    return (
        <main id="main-content" className="min-h-screen bg-gray-50 py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
                    <p className="mt-2 text-gray-600">
                        Track all your job applications and their current status
                    </p>
                </div>

                {/* Filter Tabs */}
                <div className="mb-6 border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8" aria-label="Application status filter">
                        {(['all', 'pending', 'accepted', 'rejected'] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${filter === status
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                aria-current={filter === status ? 'page' : undefined}
                            >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                                {status === filter && (
                                    <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 text-xs">
                                        {applications.length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Applications List */}
                {applications.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                        <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" aria-hidden="true" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Applications Found</h3>
                        <p className="text-gray-600 mb-4">
                            {filter === 'all'
                                ? "You haven't applied to any jobs yet"
                                : `You don't have any ${filter} applications`}
                        </p>
                        <Link href="/jobs">
                            <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                                Browse Jobs
                            </button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {applications.map((application) => {
                            const config = statusConfig[application.status];
                            const StatusIcon = config.icon;

                            return (
                                <article
                                    key={application._id}
                                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                        {/* Job Info */}
                                        <div className="flex-1">
                                            <Link
                                                href={`/jobs/${application.jobId._id}`}
                                                className="text-xl font-semibold text-gray-900 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                                            >
                                                {application.jobId.title}
                                            </Link>
                                            <p className="mt-1 text-gray-600">
                                                {application.jobId.companyId.profile?.companyName || application.jobId.companyId.name}
                                            </p>

                                            <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                                                <span className="flex items-center">
                                                    <MapPin className="h-4 w-4 mr-1" aria-hidden="true" />
                                                    <span className="sr-only">Location:</span>
                                                    {application.jobId.location}
                                                </span>
                                                <span className="flex items-center">
                                                    <Briefcase className="h-4 w-4 mr-1" aria-hidden="true" />
                                                    <span className="sr-only">Job type:</span>
                                                    {application.jobId.type}
                                                </span>
                                                <span className="flex items-center">
                                                    <Calendar className="h-4 w-4 mr-1" aria-hidden="true" />
                                                    <span className="sr-only">Applied on:</span>
                                                    Applied {new Date(application.appliedAt).toLocaleDateString()}
                                                </span>
                                            </div>

                                            {/* Cover Letter Preview */}
                                            {application.coverLetter && (
                                                <div className="mt-3">
                                                    <details className="group">
                                                        <summary className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer list-none flex items-center">
                                                            View Cover Letter
                                                            <span className="ml-1 transform group-open:rotate-180 transition-transform" aria-hidden="true">
                                                                ▼
                                                            </span>
                                                        </summary>
                                                        <p className="mt-2 text-sm text-gray-700 p-3 bg-gray-50 rounded border border-gray-200">
                                                            {application.coverLetter}
                                                        </p>
                                                    </details>
                                                </div>
                                            )}
                                        </div>

                                        {/* Status Badge - Accessible with Icon + Text */}
                                        <div
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${config.bgColor} ${config.borderColor}`}
                                            role="status"
                                            aria-label={`Application status: ${config.label}`}
                                        >
                                            <StatusIcon className={`h-5 w-5 ${config.iconColor}`} aria-hidden="true" />
                                            <span className={`font-medium ${config.textColor}`}>
                                                {config.label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="mt-4 flex gap-2 pt-4 border-t border-gray-200">
                                        <Link href={`/jobs/${application.jobId._id}`}>
                                            <button className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition">
                                                View Job
                                            </button>
                                        </Link>
                                        {application.cvUrl && application.cvUrl.startsWith('http') && (
                                            <a
                                                href={application.cvUrl}
                                                download
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                                            >
                                                Download CV
                                            </a>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}
