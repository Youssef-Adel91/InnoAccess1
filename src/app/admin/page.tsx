'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Users, Briefcase, GraduationCap, Building2, CheckCircle, XCircle, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Stats {
    users: {
        total: number;
        companies: number;
        trainers: number;
        pendingApprovals: number;
    };
    jobs: {
        active: number;
    };
    courses: {
        total: number;
        published: number;
    };
}

interface PendingCompany {
    _id: string;
    name: string;
    email: string;
    profile?: {
        companyName?: string;
        companyBio?: string;
        facebook?: string;
        linkedin?: string;
        twitter?: string;
        instagram?: string;
    };
    createdAt: string;
}

export default function AdminDashboardPage() {
    const { data: session, status } = useSession();
    const [stats, setStats] = useState<Stats | null>(null);
    const [pendingCompanies, setPendingCompanies] = useState<PendingCompany[]>([]);
    const [loading, setLoading] = useState(true);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<PendingCompany | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated' || (session && session.user.role !== 'admin')) {
            redirect('/dashboard');
        }

        if (status === 'authenticated' && session.user.role === 'admin') {
            fetchData();
        }
    }, [status, session]);

    const fetchData = async () => {
        try {
            const [statsRes, companiesRes] = await Promise.all([
                fetch('/api/admin/stats'),
                fetch('/api/admin/companies/pending'),
            ]);

            const statsData = await statsRes.json();
            const companiesData = await companiesRes.json();

            if (statsData.success) {
                setStats(statsData.data);
            }

            if (companiesData.success) {
                setPendingCompanies(companiesData.data.companies);
            }
        } catch (error) {
            console.error('Failed to fetch admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (companyId: string) => {
        if (!confirm('Approve this company?')) return;

        try {
            const response = await fetch(`/api/admin/companies/${companyId}/approve`, {
                method: 'POST',
            });

            const data = await response.json();

            if (data.success) {
                alert('Company approved successfully!');
                fetchData(); // Refresh data
            } else {
                alert(data.error?.message || 'Failed to approve company');
            }
        } catch (error) {
            console.error('Approval error:', error);
            alert('An error occurred');
        }
    };

    if (loading) {
        return (
            <main id="main-content" className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
                </div>
            </main>
        );
    }

    return (
        <main id="main-content" className="min-h-screen bg-gray-50 py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="mt-2 text-gray-600">Manage platform users, jobs, and courses</p>
                </div>

                {/* Stats Grid */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <Users className="h-8 w-8 text-blue-600" aria-hidden="true" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.users.total}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <Building2 className="h-8 w-8 text-purple-600" aria-hidden="true" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Companies</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.users.companies}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <Briefcase className="h-8 w-8 text-green-600" aria-hidden="true" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Active Jobs</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.jobs.active}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <GraduationCap className="h-8 w-8 text-yellow-600" aria-hidden="true" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Published Courses</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.courses.published}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pending Approvals */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        Pending Company Approvals
                        {pendingCompanies.length > 0 && (
                            <span className="ml-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                                {pendingCompanies.length}
                            </span>
                        )}
                    </h2>

                    {pendingCompanies.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-3" aria-hidden="true" />
                            <p>No pending approvals</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pendingCompanies.map((company) => (
                                <div
                                    key={company._id}
                                    className="flex flex-col p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h3 className="font-medium text-gray-900">
                                                {company.profile?.companyName || company.name}
                                            </h3>
                                            <p className="text-sm text-gray-600">{company.email}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Registered: {new Date(company.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => {
                                                    setSelectedCompany(company);
                                                    setReviewModalOpen(true);
                                                }}
                                                size="sm"
                                                variant="secondary"
                                                aria-label={`Review ${company.name} details`}
                                            >
                                                <Eye className="h-4 w-4 mr-1" aria-hidden="true" />
                                                Review
                                            </Button>
                                            <Button
                                                onClick={() => handleApprove(company._id)}
                                                size="sm"
                                                variant="primary"
                                                aria-label={`Approve ${company.name}`}
                                            >
                                                <CheckCircle className="h-4 w-4 mr-1" aria-hidden="true" />
                                                Approve
                                            </Button>
                                            <Button
                                                onClick={() => handleReject(company._id)}
                                                size="sm"
                                                variant="danger"
                                                aria-label={`Reject ${company.name}`}
                                            >
                                                <XCircle className="h-4 w-4 mr-1" aria-hidden="true" />
                                                Reject
                                            </Button>
                                        </div>
                                    </div>
                                    {company.profile?.companyBio && (
                                        <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
                                            <p className="text-xs font-semibold text-gray-700 mb-1">Company Description:</p>
                                            <p className="text-sm text-gray-600">{company.profile.companyBio}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Links */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Link
                        href="/jobs"
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                        <Briefcase className="h-8 w-8 text-green-600 mb-3" aria-hidden="true" />
                        <h3 className="text-lg font-semibold text-gray-900">Browse Jobs</h3>
                        <p className="mt-1 text-sm text-gray-600">View all job postings</p>
                    </Link>

                    <Link
                        href="/courses"
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                        <GraduationCap className="h-8 w-8 text-yellow-600 mb-3" aria-hidden="true" />
                        <h3 className="text-lg font-semibold text-gray-900">Browse Courses</h3>
                        <p className="mt-1 text-sm text-gray-600">View all available courses</p>
                    </Link>

                    <Link
                        href="/notifications"
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                        <Users className="h-8 w-8 text-blue-600 mb-3" aria-hidden="true" />
                        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                        <p className="mt-1 text-sm text-gray-600">View your notifications</p>
                    </Link>
                </div>

                {/* Company Review Modal */}
                {reviewModalOpen && selectedCompany && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                                <h2 className="text-xl font-semibold text-gray-900">Company Registration Details</h2>
                                <button
                                    onClick={() => {
                                        setReviewModalOpen(false);
                                        setSelectedCompany(null);
                                    }}
                                    className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                                    aria-label="Close modal"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="px-6 py-6 space-y-6">
                                {/* Basic Info */}
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Basic Information</h3>
                                    <dl className="space-y-2">
                                        <div>
                                            <dt className="text-xs font-medium text-gray-500">Company Name</dt>
                                            <dd className="mt-1 text-sm text-gray-900">
                                                {selectedCompany.profile?.companyName || 'Not provided'}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs font-medium text-gray-500">Contact Person</dt>
                                            <dd className="mt-1 text-sm text-gray-900">{selectedCompany.name}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs font-medium text-gray-500">Email</dt>
                                            <dd className="mt-1 text-sm text-gray-900">{selectedCompany.email}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs font-medium text-gray-500">Registration Date</dt>
                                            <dd className="mt-1 text-sm text-gray-900">
                                                {new Date(selectedCompany.createdAt).toLocaleString()}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>

                                {/* Company Description */}
                                {selectedCompany.profile?.companyBio && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Company Description</h3>
                                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                                {selectedCompany.profile.companyBio}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Social Media */}
                                {(selectedCompany.profile?.linkedin ||
                                    selectedCompany.profile?.facebook ||
                                    selectedCompany.profile?.twitter ||
                                    selectedCompany.profile?.instagram) && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Social Media Links</h3>
                                            <dl className="space-y-2">
                                                {selectedCompany.profile?.linkedin && (
                                                    <div>
                                                        <dt className="text-xs font-medium text-gray-500">LinkedIn</dt>
                                                        <dd className="mt-1">
                                                            <a
                                                                href={selectedCompany.profile.linkedin}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-sm text-blue-600 hover:underline break-all"
                                                            >
                                                                {selectedCompany.profile.linkedin}
                                                            </a>
                                                        </dd>
                                                    </div>
                                                )}
                                                {selectedCompany.profile?.facebook && (
                                                    <div>
                                                        <dt className="text-xs font-medium text-gray-500">Facebook</dt>
                                                        <dd className="mt-1">
                                                            <a
                                                                href={selectedCompany.profile.facebook}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-sm text-blue-600 hover:underline break-all"
                                                            >
                                                                {selectedCompany.profile.facebook}
                                                            </a>
                                                        </dd>
                                                    </div>
                                                )}
                                                {selectedCompany.profile?.twitter && (
                                                    <div>
                                                        <dt className="text-xs font-medium text-gray-500">Twitter / X</dt>
                                                        <dd className="mt-1">
                                                            <a
                                                                href={selectedCompany.profile.twitter}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-sm text-blue-600 hover:underline break-all"
                                                            >
                                                                {selectedCompany.profile.twitter}
                                                            </a>
                                                        </dd>
                                                    </div>
                                                )}
                                                {selectedCompany.profile?.instagram && (
                                                    <div>
                                                        <dt className="text-xs font-medium text-gray-500">Instagram</dt>
                                                        <dd className="mt-1">
                                                            <a
                                                                href={selectedCompany.profile.instagram}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-sm text-blue-600 hover:underline break-all"
                                                            >
                                                                {selectedCompany.profile.instagram}
                                                            </a>
                                                        </dd>
                                                    </div>
                                                )}
                                            </dl>
                                        </div>
                                    )}
                            </div>

                            {/* Modal Actions */}
                            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
                                <Button
                                    onClick={() => {
                                        setReviewModalOpen(false);
                                        setSelectedCompany(null);
                                    }}
                                    variant="secondary"
                                >
                                    Close
                                </Button>
                                <Button
                                    onClick={() => {
                                        handleApprove(selectedCompany._id);
                                        setReviewModalOpen(false);
                                        setSelectedCompany(null);
                                    }}
                                    variant="primary"
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve Company
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
