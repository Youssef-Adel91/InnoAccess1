'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { TurnstileWidget } from '@/components/ui/TurnstileWidget';
import { Eye, EyeOff } from 'lucide-react';

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

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

        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    role: formData.role,
                    companyName: formData.role === 'company' ? formData.companyName : undefined,
                    companyBio: formData.role === 'company' ? formData.companyBio : undefined,
                    turnstileToken, // Include CAPTCHA token
                    socialMedia: formData.role === 'company' ? {
                        facebook: formData.facebook || undefined,
                        linkedin: formData.linkedin || undefined,
                        twitter: formData.twitter || undefined,
                        instagram: formData.instagram || undefined,
                    } : undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error?.message || 'Registration failed');
            } else {
                setSuccess(data.data?.message || 'Registration successful!');
                // Redirect to verification page with email
                setTimeout(() => {
                    router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email)}`);
                }, 2000);
            }
        } catch (err: any) {
            setError('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main id="main-content" className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h1 className="text-center text-3xl font-bold text-gray-900">
                    Create Your Account
                </h1>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link
                        href="/auth/signin"
                        className="font-medium text-blue-600 hover:text-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                    >
                        Sign in
                    </Link>
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form onSubmit={handleSubmit} className="space-y-6" aria-label="Registration form">
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
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
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
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-required="true"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
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
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-required="true"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                All email providers accepted (Gmail, Yahoo, etc.)
                            </p>
                        </div>

                        <div>
                            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                                I am a...
                            </label>
                            <select
                                id="role"
                                name="role"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-required="true"
                            >
                                <option value="user">Job Seeker / Learner</option>
                                <option value="company">Company Employer</option>
                                <option value="trainer">Course Instructor</option>
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
                                    <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
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
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., TechCorp Egypt"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="companyBio" className="block text-sm font-medium text-gray-700">
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
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
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
                                    className="block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    aria-required="true"
                                    aria-describedby="password-requirements"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    aria-pressed={showPassword}
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                            <p id="password-requirements" className="mt-1 text-xs text-gray-500">
                                Must be at least 8 characters with uppercase, lowercase, and number
                            </p>
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
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
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-required="true"
                            />
                        </div>

                        {/* CAPTCHA Widget */}
                        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
                            <div className="flex justify-center">
                                <TurnstileWidget
                                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                                    onVerify={setTurnstileToken}
                                    onError={() => {
                                        setTurnstileToken('');
                                        setError('CAPTCHA verification failed. Please try again.');
                                    }}
                                    onExpire={() => {
                                        setTurnstileToken('');
                                        setError('CAPTCHA expired. Please verify again.');
                                    }}
                                    theme="light"
                                    size="normal"
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
