'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// 1. Component that uses useSearchParams (MUST be wrapped in Suspense)
function VerifyEmailForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email') || '';

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [timeLeft, setTimeLeft] = useState(60);
    const [canResend, setCanResend] = useState(false);

    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    setCanResend(true);
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const handleChange = (element: HTMLInputElement, index: number) => {
        if (isNaN(Number(element.value))) return;
        const newOtp = [...otp];
        newOtp[index] = element.value;
        setOtp(newOtp);
        if (element.value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const code = otp.join('');
        if (code.length !== 6) {
            setError('Please enter the complete 6-digit code');
            return;
        }

        if (!email) {
            setError('Email address is required');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: code }),
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error?.message || 'Verification failed');
            }

            setSuccess('Email verified successfully! Redirecting...');
            setTimeout(() => {
                router.push('/auth/signin');
            }, 2000);
        } catch (error: any) {
            setError(error.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!canResend || !email) return;

        setError('');
        setSuccess('');

        try {
            const res = await fetch('/api/auth/resend-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error?.message || 'Failed to resend code');
            }

            setSuccess('Verification code sent! Please check your email.');
            setTimeLeft(60);
            setCanResend(false);
            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } catch (error: any) {
            setError(error.message || 'Failed to resend code');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔐</div>
                    <h2 className="text-3xl font-bold text-gray-900">Verify Your Email</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Enter the 6-digit code sent to <strong>{email}</strong>
                    </p>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-purple-100">
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 rounded-md p-4 mb-6 text-sm" role="alert">
                            <div className="flex items-center">
                                <span className="text-xl mr-2">❌</span>
                                <span>{error}</span>
                            </div>
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-50 border-l-4 border-green-500 text-green-800 rounded-md p-4 mb-6" role="alert">
                            <div className="flex items-center">
                                <span className="text-xl mr-2">✅</span>
                                <span>{success}</span>
                            </div>
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Verification Code
                            </label>
                            <div className="flex justify-between gap-2">
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={(el) => { inputRefs.current[index] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleChange(e.target, index)}
                                        onKeyDown={(e) => handleKeyDown(e, index)}
                                        className="w-full aspect-square text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                                        aria-label={`Digit ${index + 1}`}
                                    />
                                ))}
                            </div>
                            <p className="mt-2 text-xs text-gray-500">Code expires in 15 minutes</p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Verifying...' : 'Verify Email'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600 mb-2">Didn't receive the code?</p>
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={!canResend}
                            className={`text-sm font-medium ${canResend ? 'text-purple-600 hover:text-purple-800 cursor-pointer' : 'text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            {canResend ? 'Resend Code' : `Resend in ${timeLeft}s`}
                        </button>
                    </div>

                    <div className="text-center pt-4 mt-6 border-t border-gray-200">
                        <Link href="/auth/signin" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                            ← Back to Sign In
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

// 2. Main page component with Suspense wrapper (REQUIRED for Next.js 15)
export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">⏳</div>
                    <p className="text-gray-600">Loading verification page...</p>
                </div>
            </div>
        }>
            <VerifyEmailForm />
        </Suspense>
    );
}
