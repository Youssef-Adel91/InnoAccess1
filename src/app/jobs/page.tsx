import Link from 'next/link';
import { Briefcase, MapPin, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// This will be dynamic with API data later
const sampleJobs = [
    {
        id: '1',
        title: 'Frontend Developer',
        company: 'Tech Solutions Egypt',
        location: 'Cairo, Remote',
        type: 'Full-time',
        salary: '15,000 - 25,000 EGP',
        postedAt: '2 days ago',
        accessibilityFeatures: ['Screen reader compatible workspace', 'Flexible hours', 'Remote work'],
    },
    {
        id: '2',
        title: 'Customer Support Specialist',
        company: 'InnoTech',
        location: 'Alexandria, Hybrid',
        type: 'Full-time',
        salary: '8,000 - 12,000 EGP',
        postedAt: '5 days ago',
        accessibilityFeatures: ['Accessible office', 'Voice-first tools'],
    },
    {
        id: '3',
        title: 'Content Writer',
        company: 'Digital Marketing Pro',
        location: 'Remote',
        type: 'Part-time',
        salary: '5,000 - 8,000 EGP',
        postedAt: '1 week ago',
        accessibilityFeatures: ['100% Remote', 'Flexible schedule'],
    },
];

export default function JobsPage() {
    return (
        <main id="main-content" className="min-h-screen bg-gray-50 py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Find Your Next Job</h1>
                    <p className="mt-2 text-gray-600">
                        Discover inclusive job opportunities from companies that value accessibility
                    </p>
                </div>

                {/* Filters */}
                <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <form className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="flex-1">
                            <label htmlFor="search" className="sr-only">
                                Search jobs
                            </label>
                            <input
                                type="text"
                                id="search"
                                placeholder="Search jobs..."
                                className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-label="Search for jobs"
                            />
                        </div>
                        <div>
                            <label htmlFor="location" className="sr-only">
                                Location
                            </label>
                            <select
                                id="location"
                                className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-label="Filter by location"
                            >
                                <option value="">All Locations</option>
                                <option value="cairo">Cairo</option>
                                <option value="alexandria">Alexandria</option>
                                <option value="remote">Remote</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="type" className="sr-only">
                                Job Type
                            </label>
                            <select
                                id="type"
                                className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-label="Filter by job type"
                            >
                                <option value="">All Types</option>
                                <option value="full-time">Full-time</option>
                                <option value="part-time">Part-time</option>
                                <option value="contract">Contract</option>
                            </select>
                        </div>
                        <Button variant="primary" type="submit" className="w-full">
                            Search
                        </Button>
                    </form>
                </div>

                {/* Job Listings */}
                <div className="space-y-4">
                    {sampleJobs.map((job) => (
                        <article
                            key={job.id}
                            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                        >
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                                <div className="flex-1">
                                    <h2 className="text-xl font-semibold text-gray-900">
                                        <Link
                                            href={`/jobs/${job.id}`}
                                            className="hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                                        >
                                            {job.title}
                                        </Link>
                                    </h2>
                                    <p className="mt-1 text-gray-600 font-medium">{job.company}</p>

                                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
                                        <span className="flex items-center">
                                            <MapPin className="mr-1 h-4 w-4" aria-hidden="true" />
                                            {job.location}
                                        </span>
                                        <span className="flex items-center">
                                            <Briefcase className="mr-1 h-4 w-4" aria-hidden="true" />
                                            {job.type}
                                        </span>
                                        <span className="flex items-center">
                                            <DollarSign className="mr-1 h-4 w-4" aria-hidden="true" />
                                            {job.salary}
                                        </span>
                                        <span className="flex items-center">
                                            <Clock className="mr-1 h-4 w-4" aria-hidden="true" />
                                            {job.postedAt}
                                        </span>
                                    </div>

                                    {/* Accessibility Features */}
                                    <div className="mt-3">
                                        <p className="text-sm font-medium text-gray-700 mb-2">
                                            Accessibility Features:
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {job.accessibilityFeatures.map((feature, index) => (
                                                <span
                                                    key={index}
                                                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                                                >
                                                    {feature}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 md:mt-0 md:ml-6">
                                    <Link href={`/jobs/${job.id}`}>
                                        <Button variant="primary">View Details</Button>
                                    </Link>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>

                {/* Empty State */}
                {sampleJobs.length === 0 && (
                    <div className="text-center py-12">
                        <Briefcase className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Try adjusting your search filters
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}
