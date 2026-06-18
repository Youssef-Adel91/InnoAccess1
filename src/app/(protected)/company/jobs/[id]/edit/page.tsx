'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect, useParams } from 'next/navigation';
import JobPostForm from '@/components/company/JobPostForm';

export default function EditJobPage() {
    const { data: session, status } = useSession();
    const params = useParams();
    const jobId = params.id as string;

    const [jobData, setJobData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'unauthenticated' || (session && session.user.role !== 'company')) {
            redirect('/dashboard');
        }

        if (status === 'authenticated' && session.user.role === 'company') {
            fetchJobData();
        }
    }, [status, session, jobId]);

    const fetchJobData = async () => {
        try {
            const response = await fetch(`/api/company/jobs/${jobId}`);
            const data = await response.json();

            if (data.success) {
                setJobData(data.data.job);
            } else {
                alert('Failed to load job');
                redirect('/company/jobs');
            }
        } catch (error) {
            console.error('Failed to fetch job:', error);
            alert('An error occurred');
            redirect('/company/jobs');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
                    <p className="mt-4 text-gray-600">Loading job data...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50 py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Edit Job Posting</h1>
                    <p className="mt-2 text-gray-600">Update your job listing details</p>
                </div>

                {jobData && <JobPostForm initialData={jobData} jobId={jobId} />}
            </div>
        </main>
    );
}
