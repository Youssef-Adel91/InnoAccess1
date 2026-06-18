'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
    companyLogo?: string;
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
    const t = useTranslations('Jobs');

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
                    <div className="mb-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 sm:p-8 border border-blue-100">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">{t('companyManagementTitle')}</h2>
                                <p className="mt-1 text-gray-600">{t('companyManagementDesc')}</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Link href="/company/jobs?status=draft">
                                    <button
                                        className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-600"
                                        aria-label={t('viewDrafts')}
                                    >
                                        <Briefcase className="h-5 w-5 mr-2" aria-hidden="true" />
                                        {t('viewDrafts')}
                                    </button>
                                </Link>
                                <Link href="/company/jobs/new">
                                    <button
                                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                                        aria-label={t('postNewJob')}
                                    >
                                        <Plus className="h-5 w-5 mr-2" aria-hidden="true" />
                                        {t('postNewJob')}
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
                                            {job.applicantCount || 0} {t('applicants')} • {job.location}
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => router.push(`/company/jobs/${job._id}/edit`)}
                                                className="flex-1 text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
                                                aria-label={`${t('edit')} ${job.title}`}
                                            >
                                                <Edit className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                                                {t('edit')}
                                            </button>
                                            <button
                                                onClick={() => router.push(`/company/jobs/${job._id}/applicants`)}
                                                className="flex-1 text-sm px-3 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                                aria-label={`${t('view')} ${job.title}`}
                                            >
                                                <Eye className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                                                {t('view')}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
                                <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-3" aria-hidden="true" />
                                <p className="text-gray-600 mb-4">{t('noCompanyJobs')}</p>
                                <Link href="/company/jobs/new">
                                    <button
                                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                                        aria-label={t('postFirstJob')}
                                    >
                                        <Plus className="h-5 w-5 mr-2" aria-hidden="true" />
                                        {t('postFirstJob')}
                                    </button>
                                </Link>
                            </div>
                        )}

                        {companyJobs.length > 3 && (
                            <div className="mt-4 text-center">
                                <Link href="/company/jobs" className="text-blue-600 hover:text-blue-700 font-medium">
                                    {t('viewAllJobs', { count: companyJobs.length })}
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
                        {isCompany ? t('titleCompany') : t('titleUser')}
                    </h1>
                    <p className="mt-2 text-base leading-relaxed text-gray-600">
                        {isCompany ? t('subtitleCompany') : t('subtitleUser')}
                    </p>
                </div>

                {/* Filters */}
                <div
                    className="mb-6 bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-200"
                    role="search"
                    aria-label="Filter job listings"
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                            <label htmlFor="job-search" className="sr-only">{t('searchAria')}</label>
                            <input
                                id="job-search"
                                type="search"
                                placeholder={t('searchPlaceholder')}
                                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base min-h-[44px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                aria-label={t('searchAria')}
                            />
                        </div>
                        <div>
                            <label htmlFor="job-location" className="sr-only">{t('allLocations')}</label>
                            <select
                                id="job-location"
                                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base min-h-[44px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                                value={filters.location}
                                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                                aria-label={t('allLocations')}
                            >
                                <option value="all">{t('allLocations')}</option>
                                <option value="remote">{t('remote')}</option>
                                <option value="onsite">{t('onsite')}</option>
                                <option value="hybrid">{t('hybrid')}</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="job-type" className="sr-only">{t('allTypes')}</label>
                            <select
                                id="job-type"
                                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base min-h-[44px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                                value={filters.type}
                                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                                aria-label={t('allTypes')}
                            >
                                <option value="all">{t('allTypes')}</option>
                                <option value="full-time">{t('fullTime')}</option>
                                <option value="part-time">{t('partTime')}</option>
                                <option value="internship">{t('internship')}</option>
                            </select>
                        </div>
                        <Button variant="primary" onClick={() => fetchJobs()} aria-label={t('searchBtn')} className="w-full">{t('searchBtn')}</Button>
                    </div>
                </div>

                {/* Job Listings */}
                <div className="space-y-4">
                    {loading ? (
                        <div
                            className="text-center py-12"
                            role="status"
                            aria-live="polite"
                            aria-label="Loading job listings"
                        >
                            <div
                                className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"
                                aria-hidden="true"
                            />
                            <p className="mt-4 text-gray-600">{t('loading')}</p>
                        </div>
                    ) : jobs.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                            <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('noJobs')}</h3>
                            <p className="text-gray-600">{t('noJobsDesc')}</p>
                        </div>
                    ) : (
                        jobs.map((job) => (
                            <article key={job._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                    {/* Company Logo */}
                                    {job.companyLogo && (
                                        <div className="flex-shrink-0">
                                            <img
                                                src={job.companyLogo}
                                                alt={`${job.companyId?.profile?.companyName || job.companyId?.name} company logo`}
                                                className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                                            />
                                        </div>
                                    )}

                                    <div className="flex-1">
                                        <h2 className="text-xl font-semibold text-gray-900">
                                            <Link
                                                href={`/jobs/${job._id}`}
                                                className="hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                                                aria-label={`View details for: ${job.title} at ${job.companyId?.profile?.companyName || job.companyId?.name}`}
                                            >
                                                {job.title}
                                            </Link>
                                        </h2>
                                        <p className="mt-1 text-gray-600">
                                            {job.companyId?.profile?.companyName || job.companyId?.name}
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                                            <span className="flex items-center">
                                                <MapPin className="h-4 w-4 mr-1" aria-hidden="true" />
                                                <span className="sr-only">Location: </span>
                                                {job.location}
                                            </span>
                                            <span className="flex items-center">
                                                <Briefcase className="h-4 w-4 mr-1" aria-hidden="true" />
                                                <span className="sr-only">Job type: </span>
                                                {job.jobType}
                                            </span>
                                            <span className="flex items-center">
                                                <Clock className="h-4 w-4 mr-1" aria-hidden="true" />
                                                <span className="sr-only">Posted on: </span>
                                                {new Date(job.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-4 md:mt-0 md:ml-4">
                                        <p className="text-lg font-semibold text-gray-900">
                                            <span className="sr-only">Salary range: </span>
                                            {job.salary.min.toLocaleString()} - {job.salary.max.toLocaleString()} {job.salary.currency}
                                        </p>
                                        <Link
                                            href={`/jobs/${job._id}`}
                                            aria-label={`${t('viewDetails')} ${job.title}`}
                                        >
                                            <Button variant="primary" size="sm" className="mt-2 w-full">
                                                {t('viewDetails')}
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
