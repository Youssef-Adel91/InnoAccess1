'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import TurnstileWidget, { TurnstileRef } from '@/components/ui/TurnstileWidget';
import { Eye, EyeOff } from 'lucide-react';
import TrainerRegistrationForm from '@/components/auth/TrainerRegistrationForm';
import { stopBackspacePropagation } from '@/lib/keyboardUtils';

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'user',
        companyName: '',
        companyBio: '',
        facebook: '',
        linkedin: '',
        twitter: '',
        instagram: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState('');
    const turnstileRef = useRef<TurnstileRef>(null);

    // Trainer state
    const [trainerData, setTrainerData] = useState({
        bio: '',
        specialization: '',
        linkedInUrl: '',
        websiteUrl: '',
        cvFile: null as File | null,
    });
    const [trainerErrors, setTrainerErrors] = useState({
        bio: '',
        specialization: '',
        cv: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setTrainerErrors({ bio: '', specialization: '', cv: '' });

        // CAPTCHA validation
        const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
        if (siteKey && !turnstileToken) {
            setError('Please complete the CAPTCHA verification');
            return;
        }

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        // Company-specific validation
        if (formData.role === 'company') {
            if (!formData.companyName || formData.companyName.trim().length < 2) {
                setError('Company name is required (minimum 2 characters)');
                return;
            }
            if (!formData.companyBio || formData.companyBio.trim().length < 50) {
                setError('Company description is required (minimum 50 characters). Please describe your business and why you want to hire inclusive talent.');
                return;
            }
        }

        // Trainer-specific validation
        if (formData.role === 'trainer') {
            let hasTrainerErrors = false;
            const newErrors = { bio: '', specialization: '', cv: '' };

            if (!trainerData.bio || trainerData.bio.length < 50) {
                newErrors.bio = 'Bio must be at least 50 characters';
                hasTrainerErrors = true;
            }
            if (!trainerData.specialization) {
                newErrors.specialization = 'Specialization is required';
                hasTrainerErrors = true;
            }
            if (!trainerData.cvFile) {
                newErrors.cv = 'CV upload is required';
                hasTrainerErrors = true;
            }

            if (hasTrainerErrors) {
                setTrainerErrors(newErrors);
                return;
            }
        }

        setIsLoading(true);

        try {
            // Create FormData object
            const submitData = new FormData();
            submitData.append('name', formData.name);
            submitData.append('email', formData.email);
            submitData.append('password', formData.password);
            submitData.append('role', formData.role);

            if (turnstileToken) {
                submitData.append('turnstileToken', turnstileToken);
            }

            if (formData.role === 'company') {
                submitData.append('companyName', formData.companyName);
                submitData.append('companyBio', formData.companyBio);
                if (formData.facebook) submitData.append('socialMedia[facebook]', formData.facebook);
                if (formData.linkedin) submitData.append('socialMedia[linkedin]', formData.linkedin);
                if (formData.twitter) submitData.append('socialMedia[twitter]', formData.twitter);
                if (formData.instagram) submitData.append('socialMedia[instagram]', formData.instagram);
            }

            if (formData.role === 'trainer') {
                submitData.append('bio', trainerData.bio);
                submitData.append('specialization', trainerData.specialization);
                if (trainerData.linkedInUrl) submitData.append('linkedInUrl', trainerData.linkedInUrl);
                if (trainerData.websiteUrl) submitData.append('websiteUrl', trainerData.websiteUrl);
                if (trainerData.cvFile) submitData.append('cv', trainerData.cvFile);
            }

            const response = await fetch('/api/auth/register', {
                method: 'POST',
                // Content-Type header is automatically set by browser with boundary for FormData
                body: submitData,
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error?.message || 'Registration failed');
                // Reset CAPTCHA on failure since tokens are single-use
                if (turnstileRef.current) {
                    turnstileRef.current.reset();
                }
            } else {
                setSuccess(data.data?.message || 'Account created successfully! Please sign in.');
                // Redirect directly to sign-in (email verification is auto-approved)
                setTimeout(() => {
                    router.push('/auth/signin');
                }, 1500);
            }
        } catch (err: any) {
            setError('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main id="main-content" className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-lg mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                        Create Your Account
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Already have an account?{' '}
                        <Link
                            href="/auth/signin"
                            className="font-semibold text-blue-600 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                        >
                            Sign in
                        </Link>
                    </p>
                </div>

            <div className="bg-white rounded-2xl shadow-lg ring-1 ring-gray-200 px-6 py-8 sm:px-10">

                    <form onSubmit={handleSubmit} className="space-y-5" aria-label="Registration form">
                        {error && (
                            <div
                                className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 text-sm"
                                role="alert"
                                aria-live="polite"
                            >
                                {error}
                            </div>
                        )}

                        {success && (
                            <div
                                className="bg-green-50 border border-green-200 text-green-800 rounded-md p-4"
                                role="alert"
                                aria-live="polite"
                            >
                                {success}
                            </div>
                        )}

                        <div>
                            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-0.5">
                                Full Name
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                autoComplete="name"
                                required
                                minLength={2}
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-base shadow-sm min-h-[44px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                                aria-required="true"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-0.5">
                                Email Address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-base shadow-sm min-h-[44px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                                aria-required="true"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                All email providers accepted (Gmail, Yahoo, etc.)
                            </p>
                        </div>

                        <div>
                            <label htmlFor="role" className="block text-sm font-semibold text-gray-700 mb-0.5">
                                I am a...
                            </label>
                            <select
                                id="role"
                                name="role"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-base shadow-sm min-h-[44px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                                aria-required="true"
                            >
                                <option value="user">Job Seeker / Learner</option>
                                <option value="volunteer">Volunteer</option>
                                <option value="trainer">Course Instructor</option>
                                <option value="company">Company / Employer</option>
                            </select>
                            {formData.role === 'company' && (
                                <p className="mt-2 text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                                    ⚠️ Company accounts require admin approval before posting jobs.
                                </p>
                            )}
                        </div>

                        {/* Company-specific fields */}
                        {formData.role === 'company' && (
                            <>
                                <div>
                                    <label htmlFor="companyName" className="block text-sm font-semibold text-gray-700 mb-0.5">
                                        Company Name *
                                    </label>
                                    <input
                                        id="companyName"
                                        name="companyName"
                                        type="text"
                                        required
                                        minLength={2}
                                        value={formData.companyName}
                                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                        className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-base shadow-sm min-h-[44px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                                        placeholder="e.g., TechCorp Egypt"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="companyBio" className="block text-sm font-semibold text-gray-700 mb-0.5">
                                        Company Description * (Min. 50 characters)
                                    </label>
                                    <textarea
                                        id="companyBio"
                                        name="companyBio"
                                        required
                                        minLength={50}
                                        rows={4}
                                        value={formData.companyBio}
                                        onChange={(e) => setFormData({ ...formData, companyBio: e.target.value })}
                                        className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                                        placeholder="Describe your business, mission, and why you want to hire inclusive talent..."
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        {formData.companyBio.length}/50 characters (Admin will review this)
                                    </p>
                                </div>

                                {/* Social Media Links */}
                                <div className="border-t pt-4">
                                    <h3 className="text-sm font-medium text-gray-900 mb-3">Social Media (Optional)</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label htmlFor="linkedin" className="block text-xs font-medium text-gray-600">
                                                LinkedIn
                                            </label>
                                            <input
                                                id="linkedin"
                                                name="linkedin"
                                                type="url"
                                                value={formData.linkedin}
                                                onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="https://linkedin.com/company/..."
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="facebook" className="block text-xs font-medium text-gray-600">
                                                Facebook
                                            </label>
                                            <input
                                                id="facebook"
                                                name="facebook"
                                                type="url"
                                                value={formData.facebook}
                                                onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="https://facebook.com/..."
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="twitter" className="block text-xs font-medium text-gray-600">
                                                Twitter / X
                                            </label>
                                            <input
                                                id="twitter"
                                                name="twitter"
                                                type="url"
                                                value={formData.twitter}
                                                onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="https://twitter.com/..."
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="instagram" className="block text-xs font-medium text-gray-600">
                                                Instagram
                                            </label>
                                            <input
                                                id="instagram"
                                                name="instagram"
                                                type="url"
                                                value={formData.instagram}
                                                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="https://instagram.com/..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}



                        {/* Trainer-specific fields */}
                        {formData.role === 'trainer' && (
                            <TrainerRegistrationForm
                                data={trainerData}
                                onChange={(field, value) => {
                                    if (field === 'cvError') {
                                        setTrainerErrors(prev => ({ ...prev, cv: value || '' }));
                                    } else if (field === 'cvFile') {
                                        setTrainerData(prev => ({ ...prev, cvFile: value }));
                                    } else {
                                        setTrainerData(prev => ({ ...prev, [field]: value }));
                                    }
                                }}
                                errors={{
                                    bio: trainerErrors.bio,
                                    specialization: trainerErrors.specialization,
                                    cv: trainerErrors.cv
                                }}
                            />
                        )}

                        <div>
                            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-0.5">
                                Password
                            </label>
                            <div className="mt-1 relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    required
                                    minLength={8}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    onKeyDown={stopBackspacePropagation}
                                    className="block w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 text-base shadow-sm min-h-[44px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                                    aria-required="true"
                                    aria-describedby="password-requirements"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-r-xl"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    aria-pressed={showPassword}
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                            <p id="password-requirements" className="mt-1 text-xs text-gray-500">
                                Must be at least 8 characters with uppercase, lowercase, number, and a special character (e.g. @, #, _, !)
                            </p>
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-0.5">
                                Confirm Password
                            </label>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                required
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                onKeyDown={stopBackspacePropagation}
                                className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-base shadow-sm min-h-[44px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                                aria-required="true"
                            />
                        </div>

                        {/* CAPTCHA Widget */}
                        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
                            <div className="flex justify-center">
                                <TurnstileWidget
                                    ref={turnstileRef}
                                    onVerify={setTurnstileToken}
                                />
                            </div>
                        )}

                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            isLoading={isLoading}
                            className="w-full"
                        >
                            Create Account
                        </Button>
                    </form>
                </div>
            </div>
        </main>
    );
}
