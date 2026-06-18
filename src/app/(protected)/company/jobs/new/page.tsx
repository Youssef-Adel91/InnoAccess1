'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import JobPostForm from '@/components/company/JobPostForm';

export default function NewJobPage() {
    const { data: session, status } = useSession();

    useEffect(() => {
        if (status === 'unauthenticated' || (session && session.user.role !== 'company')) {
            redirect('/dashboard');
        }

        // Redirect if company not approved
        if (session && session.user.role === 'company' && !session.user.isApproved) {
            alert('Your company account is pending admin approval.');
            redirect('/dashboard');
        }
    }, [status, session]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50 py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Post New Job</h1>
                    <p className="mt-2 text-gray-600">Create a new job posting to attract talented candidates</p>
                </div>

                <JobPostForm />
            </div>
        </main>
    );
}
