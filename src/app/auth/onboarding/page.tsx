'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UserCheck, Briefcase, BookOpen, Heart, ChevronRight, LogOut } from 'lucide-react';

const ROLE_OPTIONS = [
    {
        id: 'user',
        label: 'Job Seeker / Learner',
        description: 'Browse jobs and enroll in courses to grow your career.',
        icon: UserCheck,
        color: 'bg-blue-50 border-blue-300 text-blue-700',
        activeColor: 'bg-blue-100 border-blue-600 ring-2 ring-blue-400',
    },
    {
        id: 'volunteer',
        label: 'Volunteer',
        description: 'Contribute to the community and support inclusive initiatives.',
        icon: Heart,
        color: 'bg-purple-50 border-purple-300 text-purple-700',
        activeColor: 'bg-purple-100 border-purple-600 ring-2 ring-purple-400',
    },
    {
        id: 'trainer',
        label: 'Course Instructor',
        description: 'Share your expertise by creating and publishing courses.',
        icon: BookOpen,
        color: 'bg-green-50 border-green-300 text-green-700',
        activeColor: 'bg-green-100 border-green-600 ring-2 ring-green-400',
    },
    {
        id: 'company',
        label: 'Company / Employer',
        description: 'Post jobs and hire inclusive talent. Requires admin review.',
        icon: Briefcase,
        color: 'bg-orange-50 border-orange-300 text-orange-700',
        activeColor: 'bg-orange-100 border-orange-600 ring-2 ring-orange-400',
    },
];

export default function OnboardingPage() {
    const { data: session, status, update } = useSession();
    const router = useRouter();

    const [selectedRole, setSelectedRole] = useState('');
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Redirect away if session is loaded and user doesn't need onboarding
    useEffect(() => {
        if (status === 'loading') return;
        if (!session) {
            router.replace('/auth/signin');
            return;
        }
        if (!(session.user as any).needsOnboarding) {
            router.replace('/dashboard');
        }
    }, [session, status, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRole) {
            setError('Please select your role to continue.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/users/onboarding', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: selectedRole, phone }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error?.message || 'Something went wrong. Please try again.');
                return;
            }

            // Trigger session refresh so JWT/token picks up new role
            await update();

            router.push(data.data?.redirectTo || '/dashboard');
            router.refresh();
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    return (
        <main
            id="main-content"
            className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8"
        >
            <div className="w-full max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg mb-4">
                        <UserCheck className="w-8 h-8 text-white" aria-hidden="true" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                        Welcome to InnoAccess!
                    </h1>
                    <p className="mt-3 text-base text-gray-600 max-w-md mx-auto">
                        You&apos;re almost there, <strong>{session?.user?.name?.split(' ')[0]}</strong>.
                        Tell us how you plan to use the platform so we can personalise your experience.
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-lg ring-1 ring-gray-200 px-6 py-8 sm:px-10">
                    <form onSubmit={handleSubmit} aria-label="Role selection form">
                        {/* Role Selector */}
                        <fieldset>
                            <legend className="block text-base font-semibold text-gray-800 mb-4">
                                I am joining InnoAccess as a… <span className="text-red-500" aria-hidden="true">*</span>
                            </legend>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {ROLE_OPTIONS.map(({ id, label, description, icon: Icon, color, activeColor }) => {
                                    const isSelected = selectedRole === id;
                                    return (
                                        <button
                                            key={id}
                                            type="button"
                                            id={`role-${id}`}
                                            onClick={() => setSelectedRole(id)}
                                            aria-pressed={isSelected}
                                            className={`relative flex flex-col gap-2 p-4 border-2 rounded-xl text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-400 ${
                                                isSelected ? activeColor : `${color} hover:opacity-80`
                                            }`}
                                        >
                                            {isSelected && (
                                                <span className="absolute top-3 right-3 flex h-4 w-4 items-center justify-center rounded-full bg-current">
                                                    <span className="h-2 w-2 rounded-full bg-white" />
                                                </span>
                                            )}
                                            <Icon className="w-6 h-6" aria-hidden="true" />
                                            <span className="font-semibold text-sm">{label}</span>
                                            <span className="text-xs opacity-80 leading-snug">{description}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </fieldset>

                        {/* Trainer note */}
                        {selectedRole === 'trainer' && (
                            <div
                                className="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-sm text-yellow-800"
                                role="note"
                            >
                                📋 <strong>Note:</strong> Instructor accounts require you to submit a full application for admin review after sign-up. You will be redirected to the application form.
                            </div>
                        )}

                        {/* Company note */}
                        {selectedRole === 'company' && (
                            <div
                                className="mt-4 p-3 bg-orange-50 border border-orange-300 rounded-lg text-sm text-orange-800"
                                role="note"
                            >
                                🏢 <strong>Note:</strong> Company accounts require admin approval before posting jobs. You can complete your company profile after sign-up.
                            </div>
                        )}

                        {/* Optional Phone */}
                        <div className="mt-6">
                            <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-1">
                                Phone Number <span className="font-normal text-gray-400">(Optional)</span>
                            </label>
                            <input
                                id="phone"
                                name="phone"
                                type="tel"
                                autoComplete="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+20 1xx xxx xxxx"
                                className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-base shadow-sm min-h-[44px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                            />
                        </div>

                        {/* Error */}
                        {error && (
                            <div
                                role="alert"
                                aria-live="polite"
                                className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800"
                            >
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            id="onboarding-submit-btn"
                            disabled={isLoading || !selectedRole}
                            className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold text-base hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 transition-all duration-200 min-h-[48px]"
                            aria-label="Complete setup and go to dashboard"
                        >
                            {isLoading ? (
                                <>
                                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" aria-hidden="true" />
                                    Setting up your account…
                                </>
                            ) : (
                                <>
                                    Complete Setup
                                    <ChevronRight className="w-5 h-5" aria-hidden="true" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Sign-out escape hatch */}
                    <div className="mt-6 pt-5 border-t border-gray-100 text-center">
                        <button
                            type="button"
                            onClick={() => signOut({ callbackUrl: '/' })}
                            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded transition-colors"
                            aria-label="Sign out and cancel onboarding"
                        >
                            <LogOut className="w-4 h-4" aria-hidden="true" />
                            Cancel and sign out
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}
