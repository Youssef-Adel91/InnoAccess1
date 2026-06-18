'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, ExternalLink, Eye, FileText, Edit2, Trash2, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Job {
    _id: string;
    title: string;
    status: string;
    createdAt: string;
    applicantCount: number;
    companyLogo?: string;
    location: string;
}

export default function CompanyJobsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');

    // Read filter from URL on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const statusParam = params.get('status');
        if (statusParam === 'draft' || statusParam === 'published' || statusParam === 'all') {
            setFilter(statusParam);
        }
    }, []);

    useEffect(() => {
        if (status === 'unauthenticated' || (session && session.user.role !== 'company')) {
            redirect('/dashboard');
        }

        if (status === 'authenticated' && session.user.role === 'company') {
            fetchJobs();
        }
    }, [status, session, filter]);

    const fetchJobs = async () => {
        try {
            console.log('🔍 Fetching jobs with filter:', filter);
            const response = await fetch(`/api/company/jobs?status=${filter}`);

            console.log('📡 Response status:', response.status);
            console.log('📡 Response ok:', response.ok);

            const data = await response.json();

            console.log('📊 Full API Response:', data);

            if (data.success) {
                console.log('✅ Setting jobs:', data.data.jobs);
                setJobs(data.data.jobs);
            } else {
                console.error('❌ API Error:', data.error);
                console.error('❌ Full error response:', JSON.stringify(data, null, 2));
            }
        } catch (error) {
            console.error('Failed to fetch jobs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (jobId: string) => {
        if (!confirm('Are you sure you want to archive this job? It will no longer be visible to candidates.')) {
            return;
        }

        try {
            const response = await fetch(`/api/company/jobs/${jobId}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (data.success) {
                alert('Job archived successfully');
                fetchJobs(); // Refresh list
            } else {
                alert('Failed to archive job');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('An error occurred');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
                    <p className="mt-4 text-gray-600">Loading jobs...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50 py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">My Job Postings</h1>
                        <p className="mt-2 text-gray-600">Manage your job listings and review applications</p>
                    </div>
                    <Link href="/company/jobs/new">
                        <Button variant="primary">
                            <Plus className="h-5 w-5 mr-2" />
                            Post New Job
                        </Button>
                    </Link>
                </div>

                {/* Filter Tabs */}
                <div className="mb-6 border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setFilter('all')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${filter === 'all'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('published')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${filter === 'published'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Published
                        </button>
                        <button
                            onClick={() => setFilter('draft')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${filter === 'draft'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Drafts
                        </button>
                    </nav>
                </div>

                {/* Jobs List */}
                {jobs.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                        <p className="text-gray-500">No jobs found. Create your first job posting!</p>
                        <Link href="/company/jobs/new">
                            <Button variant="primary" className="mt-4">
                                <Plus className="h-5 w-5 mr-2" />
                                Post New Job
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {jobs.map((job) => (
                            <div
                                key={job._id}
                                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center justify-between hover:shadow-md transition"
                            >
                                <div className="flex items-start gap-4 flex-1">
                                    {/* Logo */}
                                    {job.companyLogo && (
                                        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                                            <Image
                                                src={job.companyLogo}
                                                alt=""
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    )}

                                    {/* Job Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h2 className="text-xl font-semibold text-gray-900">{job.title}</h2>
                                            <span
                                                className={`px-2 py-1 text-xs font-medium rounded ${job.status === 'published'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                    }`}
                                            >
                                                {job.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-1">
                                            {job.location.charAt(0).toUpperCase() + job.location.slice(1)}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Posted: {new Date(job.createdAt).toLocaleDateString()}
                                        </p>
                                        <p className="text-sm font-medium text-blue-600 mt-2">
                                            Applicants for this job: {job.applicantCount} persons
                                        </p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <Link href={`/company/jobs/${job._id}/edit`}>
                                        <Button variant="secondary" size="sm">
                                            <Edit2 className="h-4 w-4 mr-1" />
                                            Edit
                                        </Button>
                                    </Link>
                                    <Button
                                        onClick={() => router.push(`/company/jobs/${job._id}/applicants`)}
                                        variant="secondary"
                                        size="sm"
                                        aria-label={`View applicants for ${job.title}`}
                                    >
                                        <Eye className="h-4 w-4 mr-1" />
                                        View
                                    </Button>
                                    <Button
                                        onClick={() => handleDelete(job._id)}
                                        variant="danger"
                                        size="sm"
                                        aria-label={`Delete ${job.title}`}
                                    >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
