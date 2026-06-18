'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || 'Failed to send reset email');
            }

            setEmailSent(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (emailSent) {
        return (
            <main id="main-content" className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                            <CheckCircle className="h-10 w-10 text-green-600" />
                        </div>

                        <h1 className="text-2xl font-bold text-gray-900 mb-4">
                            Check Your Email
                        </h1>

                        <p className="text-gray-600 mb-6">
                            If an account exists for <strong>{email}</strong>, you will receive a password reset link shortly.
                        </p>

                        <p className="text-sm text-gray-500 mb-8">
                            📧 Please check your inbox and spam folder. The link will expire in 1 hour.
                        </p>

                        <Link href="/auth/signin">
                            <Button variant="primary" className="w-full">
                                <ArrowLeft className="h-5 w-5 mr-2" />
                                Back to Sign In
                            </Button>
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main id="main-content" className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h1 className="text-center text-3xl font-bold text-gray-900">
                    Forgot Password?
                </h1>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Enter your email and we'll send you a reset link
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div
                                className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4"
                                role="alert"
                            >
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email Address
                            </label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-10 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="your@email.com"
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            isLoading={isLoading}
                            className="w-full"
                        >
                            Send Reset Link
                        </Button>

                        <div className="text-center">
                            <Link
                                href="/auth/signin"
                                className="text-sm font-medium text-blue-600 hover:text-blue-500"
                            >
                                <ArrowLeft className="inline h-4 w-4 mr-1" />
                                Back to Sign In
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    );
}
