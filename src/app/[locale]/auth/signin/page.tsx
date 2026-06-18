'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Eye, EyeOff } from 'lucide-react';
import { stopBackspacePropagation } from '@/lib/keyboardUtils';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';

export default function SignInPage() {
    const t = useTranslations('Auth.signIn');
    const tErr = useTranslations('Auth.errors');

    // Use next-intl's locale-aware router so push('/dashboard') becomes
    // /en/dashboard or /ar/dashboard automatically.
    const router = useRouter();

    const [formData, setFormData] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const result = await signIn('credentials', {
                email:    formData.email,
                password: formData.password,
                redirect: false,
            });

            if (result?.error) {
                setError(result.error);
            } else if (result?.ok) {
                // next-intl's router.push automatically prepends the current locale
                router.push('/dashboard');
                router.refresh();
            }
        } catch {
            setError(tErr('unexpected'));
        } finally {
            setIsLoading(false);
        }
    };

    const inputClass =
        'mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-base shadow-sm min-h-[44px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200';
    const labelClass = 'block text-sm font-semibold text-gray-700 mb-0.5';

    return (
        <main id="main-content" className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                        {t('pageTitle')}
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                        {t('noAccount')}{' '}
                        <Link
                            href="/auth/register"
                            className="font-semibold text-blue-600 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                        >
                            {t('createAccount')}
                        </Link>
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-lg ring-1 ring-gray-200 px-6 py-8 sm:px-10">
                    <form onSubmit={handleSubmit} className="space-y-5" aria-label={t('pageTitle')}>
                        {error && (
                            <div
                                className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-sm"
                                role="alert"
                                aria-live="polite"
                            >
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className={labelClass}>
                                {t('emailLabel')}
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className={inputClass}
                                aria-required="true"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className={labelClass}>
                                {t('passwordLabel')}
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    onKeyDown={stopBackspacePropagation}
                                    className={`${inputClass} pr-12`}
                                    aria-required="true"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-r-xl"
                                    aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                                    aria-pressed={showPassword}
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="remember-me" className="text-sm text-gray-700 select-none">
                                    {t('rememberMe')}
                                </label>
                            </div>
                            <Link
                                href="/auth/forgot-password"
                                className="text-sm font-semibold text-blue-600 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                            >
                                {t('forgotPassword')}
                            </Link>
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            isLoading={isLoading}
                            className="w-full mt-2"
                        >
                            {t('submitButton')}
                        </Button>
                    </form>
                </div>
            </div>
        </main>
    );
}
