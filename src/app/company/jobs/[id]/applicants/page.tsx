'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect, useParams } from 'next/navigation';
import { FileText, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Applicant {
    _id: string;
    userId: {
        _id: string;
        name: string;
        email: string;
        profile?: {
            avatar?: string;
        };
    };
    cvUrl: string;
    status: string;
    appliedAt: string;
}

export default function ApplicantsPage() {
    const { data: session, status } = useSession();
    const params = useParams();
    const jobId = params.id as string;

    const [applicants, setApplicants] = useState<Applicant[]>([]);
    const [jobTitle, setJobTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

    useEffect(() => {
        if (status === 'unauthenticated' || (session && session.user.role !== 'company')) {
            redirect('/dashboard');
        }

        if (status === 'authenticated' && session.user.role === 'company') {
            fetchApplicants();
        }
    }, [status, session, jobId]);

    const fetchApplicants = async () => {
        try {
            const response = await fetch(`/api/company/jobs/${jobId}/applicants`);
            const data = await response.json();

            if (data.success) {
                setApplicants(data.data.applicants);
                setJobTitle(data.data.jobTitle);
            } else {
                alert('Failed to load applicants');
            }
        } catch (error) {
            console.error('Failed to fetch applicants:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (applicationId: string, newStatus: 'accepted' | 'rejected', candidateName: string) => {
        const confirmMessage = newStatus === 'accepted'
            ? `Are you sure you want to accept ${candidateName}'s application?`
            : `Are you sure you want to reject ${candidateName}'s application?`;

        if (!confirm(confirmMessage)) {
            return;
        }

        let rejectionReason = '';

        // Prompt for rejection reason if rejecting
        if (newStatus === 'rejected') {
            rejectionReason = prompt(`Please provide a reason for rejecting ${candidateName}:`) || '';

            if (!rejectionReason.trim()) {
                alert('Rejection reason is required');
                return;
            }
        }

        try {
            const response = await fetch(`/api/company/applications/${applicationId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: newStatus,
                    rejectionReason: newStatus === 'rejected' ? rejectionReason : undefined
                }),
            });

            const data = await response.json();

            if (data.success) {
                alert(data.data.message);
                fetchApplicants(); // Refresh list
            } else {
                alert(data.error?.message || 'Failed to update status');
            }
        } catch (error) {
            console.error('Update status error:', error);
            alert('An error occurred');
        }
    };

    const sortedApplicants = [...applicants].sort((a, b) => {
        const dateA = new Date(a.appliedAt).getTime();
        const dateB = new Date(b.appliedAt).getTime();
        return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
                    <p className="mt-4 text-gray-600">Loading applicants...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50 py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Applicants</h1>
                    <p className="mt-2 text-gray-600">{jobTitle}</p>
                </div>

                {/* Sort Filter */}
                <div className="mb-6 flex items-center gap-4">
                    <label htmlFor="sortBy" className="text-sm font-medium text-gray-700">
                        Date
                    </label>
                    <select
                        id="sortBy"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                    </select>
                </div>

                {/* Applicants List */}
                {applicants.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                        <p className="text-gray-500">No applicants yet</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sortedApplicants.map((applicant) => {
                            const isAccepted = applicant.status === 'accepted';
                            const isRejected = applicant.status === 'rejected';
                            const candidateName = applicant.userId.name;

                            return (
                                <div
                                    key={applicant._id}
                                    className="bg-gray-100 rounded-lg p-6 border border-gray-200 hover:shadow-md transition"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4 flex-1">
                                            {/* Profile Image */}
                                            <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center">
                                                {applicant.userId.profile?.avatar ? (
                                                    <img
                                                        src={applicant.userId.profile.avatar}
                                                        alt={`${candidateName}'s profile`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="text-2xl font-bold text-gray-400">
                                                        {candidateName.charAt(0).toUpperCase()}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Applicant Info */}
                                            <div className="flex-1">
                                                <p className="text-xs text-gray-600 mb-1">
                                                    Apply {new Date(applicant.appliedAt).toLocaleDateString() === new Date().toLocaleDateString()
                                                        ? 'today'
                                                        : `${Math.floor((new Date().getTime() - new Date(applicant.appliedAt).getTime()) / (1000 * 60 * 60 * 24 * 7))} week ago`}
                                                </p>
                                                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                                                    {candidateName}
                                                </h2>
                                                <p className="text-sm text-gray-600 mb-2">
                                                    {applicant.userId.email}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Date: {new Date(applicant.appliedAt).toLocaleDateString('en-US', {
                                                        month: '2-digit',
                                                        day: '2-digit',
                                                        year: 'numeric'
                                                    })}
                                                </p>

                                                {/* Status Badge */}
                                                {(isAccepted || isRejected) && (
                                                    <span
                                                        className={`inline-block mt-3 px-3 py-1 text-sm font-medium rounded-full ${isAccepted
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-red-100 text-red-800'
                                                            }`}
                                                    >
                                                        {isAccepted ? 'Accepted' : 'Rejected'}
                                                    </span>
                                                )}

                                                {/* Action Buttons */}
                                                <div className="flex gap-3 mt-4">
                                                    {/* Direct Download CV Link */}
                                                    {applicant.cvUrl && applicant.cvUrl.startsWith('http') ? (
                                                        <a
                                                            href={applicant.cvUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                                                            aria-label={`View CV for ${candidateName}`}
                                                        >
                                                            <FileText className="h-4 w-4 mr-1" />
                                                            View CV
                                                        </a>
                                                    ) : (
                                                        <span className="text-xs text-gray-500 italic px-3 py-2">
                                                            CV not available (Cloudinary not configured)
                                                        </span>
                                                    )}
                                                    {!isAccepted && (
                                                        <Button
                                                            onClick={() => handleStatusUpdate(applicant._id, 'accepted', candidateName)}
                                                            variant="primary"
                                                            size="sm"
                                                            aria-label={`Accept candidate ${candidateName}`}
                                                        >
                                                            <CheckCircle className="h-4 w-4 mr-1" />
                                                            Accept
                                                        </Button>
                                                    )}
                                                    {!isRejected && (
                                                        <Button
                                                            onClick={() => handleStatusUpdate(applicant._id, 'rejected', candidateName)}
                                                            variant="danger"
                                                            size="sm"
                                                            aria-label={`Reject candidate ${candidateName}`}
                                                        >
                                                            <XCircle className="h-4 w-4 mr-1" />
                                                            Reject
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Company Logo Placeholder (right side) */}
                                        <div className="w-48 h-48 bg-teal-900 rounded-lg flex-shrink-0 flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="w-16 h-16 bg-teal-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                                                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                                                    </svg>
                                                </div>
                                                <p className="text-white text-xs font-medium">COMPANY TECH</p>
                                                <p className="text-teal-300 text-xs">SHAPING TODAY'S WORK</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}
