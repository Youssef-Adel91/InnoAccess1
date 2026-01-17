'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    submitTrainerApplication,
    getUserTrainerProfile,
} from '@/app/actions/trainerApplication';
import { uploadTrainerCV } from '@/app/actions/uploadTrainerCV';

export default function JoinTrainerPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

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

    const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (file.type !== 'application/pdf') {
            setError('Please upload a PDF file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('CV file size must be less than 5MB');
            return;
        }

        setCvFile(file);
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!cvFile && !cvUrl) {
            setError('Please upload your CV');
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
                    <p className="mt-4 text-gray-600">Loading...</p>
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
                                Application Under Review
                            </h1>
                            <p className="text-gray-600 mb-6">
                                Your trainer application has been submitted and is currently being
                                reviewed by our admin team. You will be notified once a decision
                                has been made.
                            </p>
                            <div className="bg-blue-50 rounded-lg p-4 text-left">
                                <h3 className="font-semibold text-gray-900 mb-2">
                                    Application Details:
                                </h3>
                                <p className="text-sm text-gray-600">
                                    <strong>Specialization:</strong> {profile.specialization}
                                </p>
                                <p className="text-sm text-gray-600">
                                    <strong>Submitted:</strong>{' '}
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
                                Congratulations! You're Approved
                            </h1>
                            <p className="text-gray-600 mb-6">
                                Your trainer application has been approved. You can now access the
                                trainer dashboard and start creating courses.
                            </p>
                            <button
                                onClick={() => router.push('/trainer/dashboard')}
                                className="bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                                Go to Trainer Dashboard
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
                                    Application Rejected
                                </h1>
                            </div>

                            {profile.rejectionReason && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                                    <h3 className="font-semibold text-red-900 mb-2">
                                        Rejection Reason:
                                    </h3>
                                    <p className="text-red-800">{profile.rejectionReason}</p>
                                </div>
                            )}

                            <p className="text-gray-600 text-center mb-6">
                                You can address the feedback above and reapply using the form below.
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
                                Reapply as Trainer
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
                        Become a Trainer
                    </h1>
                    <p className="text-gray-600 mb-8">
                        Fill out the application form below to join InnoAccess as a trainer. Your
                        application will be reviewed by our admin team.
                    </p>

                    <form onSubmit={handleSubmit}>
                        {/* Bio */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Bio / Professional Summary *
                            </label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                required
                                minLength={50}
                                maxLength={2000}
                                rows={6}
                                placeholder="Tell us about your professional background, expertise, and teaching experience (minimum 50 characters)..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p className="mt-1 text-sm text-gray-500">
                                {bio.length}/2000 characters (minimum 50)
                            </p>
                        </div>

                        {/* Specialization */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Specialization *
                            </label>
                            <input
                                type="text"
                                value={specialization}
                                onChange={(e) => setSpecialization(e.target.value)}
                                required
                                placeholder="e.g., Web Development, Data Science, UI/UX Design"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* LinkedIn URL */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                LinkedIn Profile (Optional)
                            </label>
                            <input
                                type="url"
                                value={linkedInUrl}
                                onChange={(e) => setLinkedInUrl(e.target.value)}
                                placeholder="https://linkedin.com/in/yourprofile"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Website URL */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Portfolio / Website (Optional)
                            </label>
                            <input
                                type="url"
                                value={websiteUrl}
                                onChange={(e) => setWebsiteUrl(e.target.value)}
                                placeholder="https://yourwebsite.com"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* CV Upload */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                CV / Resume (PDF only) *
                            </label>
                            <input
                                type="file"
                                accept=".pdf,application/pdf"
                                onChange={handleCvUpload}
                                required={!cvUrl}
                                className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                            />
                            {cvFile && (
                                <p className="mt-2 text-sm text-green-600">
                                    ✓ Selected: {cvFile.name}
                                </p>
                            )}
                            {cvUrl && !cvFile && (
                                <p className="mt-2 text-sm text-gray-600">
                                    Using previously uploaded CV
                                </p>
                            )}
                            <p className="mt-1 text-sm text-gray-500">
                                Maximum file size: 5MB
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={submitting || !bio || !specialization || (!cvFile && !cvUrl)}
                            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                            {uploading
                                ? 'Uploading CV...'
                                : submitting
                                    ? 'Submitting Application...'
                                    : 'Submit Application'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
