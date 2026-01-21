'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function VerifyEmailPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const emailFromQuery = searchParams.get('email') || '';

    const [email, setEmail] = useState(emailFromQuery);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [resendCountdown, setResendCountdown] = useState(0);

    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Countdown timer for resend button
    useEffect(() => {
        if (resendCountdown > 0) {
            const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCountdown]);

    const handleOTPChange = (index: number, value: string) => {
        // Only allow numbers
        if (value && !/^\d$/.test(value)) return;


        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all 6 digits are entered
        if (index === 5 && value) {
            const fullOtp = newOtp.join('');
            if (fullOtp.length === 6) {
                handleVerify(fullOtp);
            }
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerify = async (otpValue?: string) => {
        setError('');
        setSuccess('');

        const fullOtp = otpValue || otp.join('');

        if (fullOtp.length !== 6) {
            setError('Please enter all 6 digits');
            return;
        }

        if (!email) {
            setError('Please enter your email address');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, otp: fullOtp }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error?.message || 'Verification failed');
            } else {
                setSuccess(data.data?.message || 'Email verified successfully!');
                // Redirect to signin after 2 seconds
                setTimeout(() => {
                    router.push('/auth/signin');
                }, 2000);
            }
        } catch (err: any) {
            setError('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        setError('');
        setSuccess('');

        if (!email) {
            setError('Please enter your email address');
            return;
        }

        setIsResending(true);

        try {
            const response = await fetch('/api/auth/resend-verification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error?.message || 'Failed to resend code');
            } else {
                setSuccess('New verification code sent! Please check your email.');
                setResendCountdown(60); // 60 second cooldown
                setOtp(['', '', '', '', '', '']); // Clear OTP inputs
                inputRefs.current[0]?.focus();
            }
        } catch (err: any) {
            setError('An unexpected error occurred');
        } finally {
            setIsResending(false);
        }
    };

    return (
        <main id="main-content" className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔐</div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Verify Your Email
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Enter the 6-digit code sent to your email
                    </p>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-purple-100">
                    {error && (
                        <div
                            className="bg-red-50 border-l-4 border-red-500 text-red-800 rounded-md p-4 mb-6 text-sm"
                            role="alert"
                            aria-live="polite"
                        >
                            <div className="flex items-center">
                                <span className="text-xl mr-2">❌</span>
                                <span>{error}</span>
                            </div>
                        </div>
                    )}

                    {success && (
                        <div
                            className="bg-green-50 border-l-4 border-green-500 text-green-800 rounded-md p-4 mb-6"
                            role="alert"
                            aria-live="polite"
                        >
                            <div className="flex items-center">
                                <span className="text-xl mr-2">✅</span>
                                <span>{success}</span>
                            </div>
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Email Input */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email Address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="your@email.com"
                                disabled={!!emailFromQuery}
                            />
                        </div>

                        {/* OTP Input */}
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
                                        onChange={(e) => handleOTPChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        className="w-full aspect-square text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                                        aria-label={`Digit ${index + 1}`}
                                    />
                                ))}
                            </div>
                            <p className="mt-2 text-xs text-gray-500">
                                Code expires in 15 minutes
                            </p>
                        </div>

                        {/* Verify Button */}
                        <Button
                            type="button"
                            variant="primary"
                            size="lg"
                            onClick={() => handleVerify()}
                            isLoading={isLoading}
                            className="w-full"
                        >
                            Verify Email
                        </Button>

                        {/* Resend Code */}
                        <div className="text-center">
                            <p className="text-sm text-gray-600 mb-2">
                                Didn't receive the code?
                            </p>
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={isResending || resendCountdown > 0}
                                className="text-purple-600 hover:text-purple-800 font-medium text-sm disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                            >
                                {resendCountdown > 0
                                    ? `Resend in ${resendCountdown}s`
                                    : isResending
                                        ? 'Sending...'
                                        : 'Resend Code'}
                            </button>
                        </div>

                        {/* Back to Sign In */}
                        <div className="text-center pt-4 border-t border-gray-200">
                            <Link
                                href="/auth/signin"
                                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                ← Back to Sign In
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
