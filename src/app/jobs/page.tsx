'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, Briefcase, Clock, Plus, Edit, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Job {
    _id: string;
    title: string;
    companyId: {
        name: string;
        profile?: { companyName?: string };
    };
    location: string;
    type: string;
    jobType: string;
    salary: { min: number; max: number; currency: string };
    createdAt: string;
}

interface CompanyJob {
    _id: string;
    title: string;
    status: string;
    applicantCount: number;
    location: string;
}

export default function JobsPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [companyJobs, setCompanyJobs] = useState<CompanyJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ search: '', location: 'all', type: 'all' });

    const isCompany = session?.user?.role === 'company';

    useEffect(() => {
        fetchJobs();
        if (isCompany) {
            fetchCompanyJobs();
        }
    }, [filters, isCompany]);

    const fetchCompanyJobs = async () => {
        try {
            const response = await fetch('/api/company/jobs?status=all');
            const data = await response.json();
            if (data.success) {
                setCompanyJobs(data.data.jobs);
            }
        } catch (error) {
            console.error('Failed to fetch company jobs:', error);
        }
    };

    const fetchJobs = async () => {
        try {
            const queryParams = new URLSearchParams();
            if (filters.search) queryParams.append('search', filters.search);
            if (filters.location && filters.location !== 'all') queryParams.append('type', filters.location);
            if (filters.type && filters.type !== 'all') queryParams.append('jobType', filters.type);

            const response = await fetch(`/api/jobs?${queryParams}`);
            const data = await response.json();

            if (data.success) {
                setJobs(data.data.jobs);
            }
        } catch (error) {
            console.error('Failed to fetch jobs:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main id="main-content" className="min-h-screen bg-gray-50 py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Company Job Management Section */}
                {isCompany && (
                    <div className="mb-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-8 border border-blue-200">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Your Job Management</h2>
                                <p className="mt-1 text-gray-600">Manage your postings and review applications</p>
                            </div>
                            <div className="flex gap-3">
                                <Link href="/company/jobs?status=draft">
                                    <button className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-600">
                                        <Briefcase className="h-5 w-5 mr-2" />
                                        View Drafts
                                    </button>
                                </Link>
                                <Link href="/company/jobs/new">
                                    <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                                        <Plus className="h-5 w-5 mr-2" />
                                        Post New Job
                                    </button>
                                </Link>
                            </div>
                        </div>

                        {/* Company Jobs Quick View */}
                        {companyJobs.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {companyJobs.slice(0, 3).map((job) => (
                                    <div key={job._id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">{job.title}</h3>
                                            <span className={`px-2 py-1 text-xs font-medium rounded ${job.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {job.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-3">
                                            {job.applicantCount || 0} applicants • {job.location}
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => router.push(`/company/jobs/${job._id}/edit`)}
                                                className="flex-1 text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition flex items-center justify-center"
                                            >
                                                <Edit className="h-3.5 w-3.5 mr-1" />
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => router.push(`/company/jobs/${job._id}/applicants`)}
                                                className="flex-1 text-sm px-3 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition flex items-center justify-center"
                                            >
                                                <Eye className="h-3.5 w-3.5 mr-1" />
                                                View
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
                                <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-600 mb-4">You haven&apos;t posted any jobs yet</p>
                                <Link href="/company/jobs/new">
                                    <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                                        <Plus className="h-5 w-5 mr-2" />
                                        Post Your First Job
                                    </button>
                                </Link>
                            </div>
                        )}

                        {companyJobs.length > 3 && (
                            <div className="mt-4 text-center">
                                <Link href="/company/jobs" className="text-blue-600 hover:text-blue-700 font-medium">
                                    View All {companyJobs.length} Jobs →
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        {isCompany ? 'Browse All Available Jobs' : 'Find Your Next Opportunity'}
                    </h1>
                    <p className="mt-2 text-gray-600">
                        {isCompany ? 'See what other companies are posting' : 'Discover accessible job opportunities that match your skills'}
                    </p>
                </div>

                {/* Filters */}
                <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input
                            type="text"
                            placeholder="Search jobs..."
                            className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        />
                        <select
                            className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={filters.location}
                            onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                        >
                            <option value="all">All Locations</option>
                            <option value="remote">Remote</option>
                            <option value="onsite">Onsite</option>
                            <option value="hybrid">Hybrid</option>
                        </select>
                        <select
                            className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={filters.type}
                            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                        >
                            <option value="all">All Types</option>
                            <option value="full-time">Full-time</option>
                            <option value="part-time">Part-time</option>
                            <option value="internship">Internship</option>
                        </select>
                        <Button variant="primary" onClick={() => fetchJobs()}>Search</Button>
                    </div>
                </div>

                {/* Job Listings */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
                            <p className="mt-4 text-gray-600">Loading jobs...</p>
                        </div>
                    ) : jobs.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                            <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Jobs Found</h3>
                            <p className="text-gray-600">Try adjusting your filters or check back later for new opportunities</p>
                        </div>
                    ) : (
                        jobs.map((job) => (
                            <article key={job._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                                <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                                    <div className="flex-1">
                                        <h2 className="text-xl font-semibold text-gray-900">
                                            <Link href={`/jobs/${job._id}`} className="hover:text-blue-600">
                                                {job.title}
                                            </Link>
                                        </h2>
                                        <p className="mt-1 text-gray-600">
                                            {job.companyId?.profile?.companyName || job.companyId?.name}
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                                            <span className="flex items-center">
                                                <MapPin className="h-4 w-4 mr-1" />
                                                {job.location}
                                            </span>
                                            <span className="flex items-center">
                                                <Briefcase className="h-4 w-4 mr-1" />
                                                {job.jobType}
                                            </span>
                                            <span className="flex items-center">
                                                <Clock className="h-4 w-4 mr-1" />
                                                {new Date(job.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-4 md:mt-0 md:ml-4">
                                        <p className="text-lg font-semibold text-gray-900">
                                            {job.salary.min.toLocaleString()} - {job.salary.max.toLocaleString()} {job.salary.currency}
                                        </p>
                                        <Link href={`/jobs/${job._id}`}>
                                            <Button variant="primary" size="sm" className="mt-2 w-full">
                                                View Details
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </article>
                        ))
                    )}
                </div>
            </div>
        </main>
    );
}
