'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
    submitTrainerApplication,
    getUserTrainerProfile,
} from '@/app/actions/trainerApplication';
import { uploadTrainerCV } from '@/app/actions/uploadTrainerCV';
import TrainerRegistrationForm from '@/components/auth/TrainerRegistrationForm';

export default function JoinTrainerPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const t = useTranslations('JoinTrainer');

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [bio, setBio] = useState('');
    const [linkedInUrl, setLinkedInUrl] = useState('');
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [specialization, setSpecialization] = useState('');
    const [cvFile, setCvFile] = useState<File | null>(null);
    const [cvUrl, setCvUrl] = useState('');

    // Check authentication and existing profile
    useEffect(() => {
        if (status === 'loading') return;

        if (!session) {
            router.push('/api/auth/signin');
            return;
        }

        if (session.user.role !== 'user') {
            router.push('/');
            return;
        }

        fetchProfile();
    }, [session, status, router]);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const result = await getUserTrainerProfile();
            if (result.success && result.data?.profile) {
                setProfile(result.data.profile);
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
        } finally {
            setLoading(false);
        }
    };



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!cvFile && !cvUrl) {
            setError(t('errorCV'));
            return;
        }

        setSubmitting(true);
        setUploading(true);

        try {
            let uploadedCvUrl = cvUrl;

            // Upload CV to Vercel Blob if new file selected
            if (cvFile) {
                console.log('📤 Uploading CV to Vercel Blob...');

                // Create FormData for server action
                const formData = new FormData();
                formData.append('cv', cvFile);

                const uploadResult = await uploadTrainerCV(formData);

                if (!uploadResult.success) {
                    throw new Error(uploadResult.error?.message || 'Failed to upload CV');
                }

                uploadedCvUrl = uploadResult.data?.url || '';
                console.log('✅ CV uploaded:', uploadedCvUrl);
            }

            setUploading(false);

            // Submit application
            console.log('📝 Submitting trainer application...');
            const result = await submitTrainerApplication({
                bio,
                linkedInUrl: linkedInUrl || undefined,
                websiteUrl: websiteUrl || undefined,
                cvUrl: uploadedCvUrl,
                specialization,
            });

            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to submit application');
            }

            console.log('✅ Application submitted successfully');

            // Refresh profile
            await fetchProfile();
        } catch (err: any) {
            console.error('❌ Submit error:', err);
            setError(err.message || 'Failed to submit application');
        } finally {
            setSubmitting(false);
            setUploading(false);
        }
    };

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">{t('loading')}</p>
                </div>
            </div>
        );
    }

    // Show status if profile exists
    if (profile) {
        if (profile.status === 'pending') {
            return (
                <div className="min-h-screen bg-gray-100 py-12">
                    <div className="max-w-2xl mx-auto px-4">
                        <div className="bg-white rounded-lg shadow-md p-8 text-center">
                            <div className="text-6xl mb-4">⏳</div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-4">
                                {t('reviewTitle')}
                            </h1>
                            <p className="text-gray-600 mb-6">
                                {t('reviewText')}
                            </p>
                            <div className="bg-blue-50 rounded-lg p-4 text-left">
                                <h3 className="font-semibold text-gray-900 mb-2">
                                    {t('appDetails')}
                                </h3>
                                <p className="text-sm text-gray-600">
                                    <strong>{t('specialization')}</strong> {profile.specialization}
                                </p>
                                <p className="text-sm text-gray-600">
                                    <strong>{t('submitted')}</strong>{' '}
                                    {new Date(profile.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (profile.status === 'approved') {
            return (
                <div className="min-h-screen bg-gray-100 py-12">
                    <div className="max-w-2xl mx-auto px-4">
                        <div className="bg-white rounded-lg shadow-md p-8 text-center">
                            <div className="text-6xl mb-4">🎉</div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-4">
                                {t('approvedTitle')}
                            </h1>
                            <p className="text-gray-600 mb-6">
                                {t('approvedText')}
                            </p>
                            <button
                                onClick={() => router.push('/trainer/dashboard')}
                                className="bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                                {t('goToDashboard')}
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        if (profile.status === 'rejected') {
            // Show rejection reason and allow reapplication
            return (
                <div className="min-h-screen bg-gray-100 py-12">
                    <div className="max-w-2xl mx-auto px-4">
                        <div className="bg-white rounded-lg shadow-md p-8">
                            <div className="text-center mb-6">
                                <div className="text-6xl mb-4">❌</div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                                    {t('rejectedTitle')}
                                </h1>
                            </div>

                            {profile.rejectionReason && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                                    <h3 className="font-semibold text-red-900 mb-2">
                                        {t('rejectedReason')}
                                    </h3>
                                    <p className="text-red-800">{profile.rejectionReason}</p>
                                </div>
                            )}

                            <p className="text-gray-600 text-center mb-6">
                                {t('rejectedText')}
                            </p>

                            <button
                                onClick={() => {
                                    setProfile(null);
                                    setBio(profile.bio || '');
                                    setLinkedInUrl(profile.linkedInUrl || '');
                                    setWebsiteUrl(profile.websiteUrl || '');
                                    setSpecialization(profile.specialization || '');
                                    setCvUrl(profile.cvUrl || '');
                                }}
                                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                                {t('reapply')}
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
    }

    // Show application form
    return (
        <div className="min-h-screen bg-gray-100 py-12">
            <div className="max-w-3xl mx-auto px-4">
                <div className="bg-white rounded-lg shadow-md p-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {t('title')}
                    </h1>
                    <p className="text-gray-600 mb-8">
                        {t('subtitle')}
                    </p>

                    <form onSubmit={handleSubmit}>
                        <TrainerRegistrationForm
                            data={{
                                bio,
                                specialization,
                                linkedInUrl,
                                websiteUrl,
                                cvFile,
                                cvUrl
                            }}
                            onChange={(field, value) => {
                                switch (field) {
                                    case 'bio': setBio(value); break;
                                    case 'specialization': setSpecialization(value); break;
                                    case 'linkedInUrl': setLinkedInUrl(value); break;
                                    case 'websiteUrl': setWebsiteUrl(value); break;
                                    case 'cvFile': setCvFile(value); break;
                                    case 'cvError': setError(value); break;
                                }
                            }}
                            errors={{
                                cv: error?.includes('CV') ? error : undefined
                            }}
                        />

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={submitting || !bio || !specialization || (!cvFile && !cvUrl)}
                            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                            {uploading
                                ? t('uploading')
                                : submitting
                                    ? t('submitting')
                                    : t('submitBtn')}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
