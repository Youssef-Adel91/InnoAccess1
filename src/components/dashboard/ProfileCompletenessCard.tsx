'use client';

import Link from 'next/link';
import { CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { ProfileCompletenessResult, fieldDisplayNames, getProfileStrength } from '@/lib/profileCompleteness';

interface ProfileCompletenessProps {
    completeness: ProfileCompletenessResult;
}

export function ProfileCompletenessCard({ completeness }: ProfileCompletenessProps) {
    const { percentage, missingFields } = completeness;
    const strength = getProfileStrength(percentage);

    // Don't show if profile is 100% complete
    if (percentage === 100) {
        return (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-lg p-6">
                <div className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <div className="ml-4 flex-1">
                        <h3 className="text-lg font-semibold text-green-900">
                            Profile Complete! 🎉
                        </h3>
                        <p className="mt-1 text-sm text-green-700">
                            Your profile is fully optimized. You&apos;re ready to attract top employers!
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                    <AlertCircle className={`h-6 w-6 ${strength.color} mr-2`} aria-hidden="true" />
                    <h2 className="text-lg font-semibold text-gray-900">
                        Profile Completeness
                    </h2>
                </div>
                <span className={`text-2xl font-bold ${strength.color}`}>
                    {percentage}%
                </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                        className={`h-full transition-all duration-500 rounded-full ${percentage < 40
                                ? 'bg-red-500'
                                : percentage < 70
                                    ? 'bg-yellow-500'
                                    : percentage < 100
                                        ? 'bg-blue-500'
                                        : 'bg-green-500'
                            }`}
                        style={{ width: `${percentage}%` }}
                        role="progressbar"
                        aria-valuenow={percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                    />
                </div>
            </div>

            {/* Message */}
            <p className={`text-sm ${strength.color} mb-4`}>
                {strength.message}
            </p>

            {/* Missing Fields */}
            {missingFields.length > 0 && (
                <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                        Missing fields:
                    </p>
                    <ul className="space-y-1">
                        {missingFields.slice(0, 3).map((field) => (
                            <li key={field} className="flex items-center text-sm text-gray-600">
                                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 mr-2" aria-hidden="true" />
                                {fieldDisplayNames[field] || field}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* CTA Button */}
            <Link
                href="/profile"
                className="inline-flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
                Complete Your Profile
                <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
            </Link>
        </div>
    );
}
