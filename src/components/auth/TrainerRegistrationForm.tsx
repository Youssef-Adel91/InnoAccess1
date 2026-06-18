'use client';

import React, { useRef } from 'react';
import { useFileUpload } from '@/hooks/useFileUpload';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TrainerRegistrationFormProps {
    data: {
        bio: string;
        specialization: string;
        linkedInUrl: string;
        websiteUrl: string;
        cvFile: File | null;
        cvUrl?: string; // Previously uploaded CV URL (edit flow)
    };
    onChange: (field: string, value: unknown) => void;
    errors?: {
        bio?: string;
        specialization?: string;
        cv?: string;
    };
    /**
     * Called by this component after a successful Vercel Blob upload.
     * The parent must store this URL and include it in the final form submission
     * so the API route doesn't have to re-upload the file.
     */
    onCvUploaded?: (url: string) => void;
}

// ─── Accessible Progress Bar sub-component ─────────────────────────────────────

interface ProgressBarProps {
    /** 0–100 */
    progress: number;
    label: string;
}

function ProgressBar({ progress, label }: ProgressBarProps) {
    return (
        <div className="mt-3" aria-label={label}>
            {/* ARIA progressbar — all required attributes for screen readers */}
            <div
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={label}
                className="h-2.5 w-full rounded-full bg-gray-200 overflow-hidden"
            >
                <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>
            {/* Visible percentage label */}
            <p className="mt-1 text-xs text-gray-500 text-right" aria-hidden="true">
                {progress}%
            </p>
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function TrainerRegistrationForm({
    data,
    onChange,
    errors,
    onCvUploaded,
}: TrainerRegistrationFormProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { progress, status, upload, reset } = useFileUpload();

    // ── File selection handler ───────────────────────────────────────────────
    const handleCvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Client-side validation — fast, before any network call
        if (file.type !== 'application/pdf') {
            onChange('cvError', 'Please upload a PDF file.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            onChange('cvError', 'CV file size must be less than 5 MB.');
            return;
        }

        // Store the File object for parent to use (fallback / display)
        onChange('cvFile', file);
        onChange('cvError', null);

        // ── Upload immediately so the user sees progress ─────────────────────
        // The endpoint URL must include the filename as a query param.
        // The existing /api/blob/upload route accepts POST with Content-Type.
        // We need a separate CV endpoint that accepts PDFs — see note below.
        const endpoint = `/api/blob/upload-cv?filename=${encodeURIComponent(file.name)}`;

        try {
            const url = await upload(file, endpoint);
            // Notify parent of the uploaded URL so it can be sent to the API
            onCvUploaded?.(url);
            onChange('cvUrl', url);
        } catch {
            // Error state is already reflected in useFileUpload's `status`
            onChange('cvError', 'Upload failed. Please try again.');
        }
    };

    // ── Remove / re-select handler ───────────────────────────────────────────
    const handleRemoveCv = () => {
        reset();
        onChange('cvFile', null);
        onChange('cvUrl', undefined);
        onChange('cvError', null);
        // Reset the actual file input element so the same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ── Derived booleans for readability ─────────────────────────────────────
    const isUploading  = status === 'uploading';
    const isSuccess    = status === 'success';
    const isError      = status === 'error';
    const hasPriorCv   = Boolean(data.cvUrl) && !isError;

    // ── Accessible status message for aria-live region ───────────────────────
    const liveMessage = (() => {
        if (isUploading) return `Uploading CV: ${progress}%`;
        if (isSuccess)   return 'CV uploaded successfully.';
        if (isError)     return 'CV upload failed. Please try again.';
        if (hasPriorCv)  return 'Previously uploaded CV is ready.';
        return '';
    })();

    return (
        <div className="space-y-6 border-t pt-6 mt-6" role="group" aria-labelledby="trainer-info-heading">
            <h3 id="trainer-info-heading" className="text-lg font-medium text-gray-900">
                Trainer Information
            </h3>
            <p id="trainer-info-desc" className="text-sm text-gray-500">
                Please provide your professional details for admin review.
            </p>

            {/* ── Bio ──────────────────────────────────────────────────────── */}
            <div>
                <label htmlFor="trainer-bio" className="block text-sm font-medium text-gray-700 mb-2">
                    Bio / Professional Summary
                    <span aria-hidden="true"> *</span>
                    <span className="sr-only"> (required)</span>
                </label>
                <textarea
                    id="trainer-bio"
                    value={data.bio}
                    onChange={(e) => onChange('bio', e.target.value)}
                    required
                    aria-required="true"
                    aria-describedby="trainer-bio-count trainer-bio-error"
                    minLength={50}
                    maxLength={2000}
                    rows={6}
                    placeholder="Tell us about your professional background, expertise, and teaching experience (minimum 50 characters)..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus-visible:outline-none"
                />
                <div className="flex justify-between mt-1">
                    <p id="trainer-bio-count" className="text-xs text-gray-500">
                        <span className="sr-only">Character count: </span>
                        {data.bio.length}/2000 characters (minimum 50)
                    </p>
                    {errors?.bio && (
                        <p id="trainer-bio-error" className="text-xs text-red-600" role="alert">
                            {errors.bio}
                        </p>
                    )}
                </div>
            </div>

            {/* ── Specialization ───────────────────────────────────────────── */}
            <div>
                <label htmlFor="trainer-specialization" className="block text-sm font-medium text-gray-700 mb-2">
                    Specialization
                    <span aria-hidden="true"> *</span>
                    <span className="sr-only"> (required)</span>
                </label>
                <input
                    id="trainer-specialization"
                    type="text"
                    value={data.specialization}
                    onChange={(e) => onChange('specialization', e.target.value)}
                    required
                    aria-required="true"
                    aria-describedby={errors?.specialization ? 'trainer-spec-error' : undefined}
                    placeholder="e.g., Web Development, Data Science, UI/UX Design"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus-visible:outline-none"
                />
                {errors?.specialization && (
                    <p id="trainer-spec-error" className="mt-1 text-xs text-red-600" role="alert">
                        {errors.specialization}
                    </p>
                )}
            </div>

            {/* ── LinkedIn URL ─────────────────────────────────────────────── */}
            <div>
                <label htmlFor="trainer-linkedin" className="block text-sm font-medium text-gray-700 mb-2">
                    LinkedIn Profile (Optional)
                </label>
                <input
                    id="trainer-linkedin"
                    type="url"
                    value={data.linkedInUrl}
                    onChange={(e) => onChange('linkedInUrl', e.target.value)}
                    autoComplete="url"
                    placeholder="https://linkedin.com/in/yourprofile"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus-visible:outline-none"
                />
            </div>

            {/* ── Website URL ──────────────────────────────────────────────── */}
            <div>
                <label htmlFor="trainer-website" className="block text-sm font-medium text-gray-700 mb-2">
                    Portfolio / Website (Optional)
                </label>
                <input
                    id="trainer-website"
                    type="url"
                    value={data.websiteUrl}
                    onChange={(e) => onChange('websiteUrl', e.target.value)}
                    autoComplete="url"
                    placeholder="https://yourwebsite.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus-visible:outline-none"
                />
            </div>

            {/* ── CV Upload ────────────────────────────────────────────────── */}
            <div>
                <label htmlFor="trainer-cv" className="block text-sm font-medium text-gray-700 mb-2">
                    CV / Resume (PDF only)
                    <span aria-hidden="true"> *</span>
                    <span className="sr-only"> (required)</span>
                </label>

                {/* ── Idle / Error: show the file picker ─────────────────── */}
                {!isSuccess && !hasPriorCv && (
                    <input
                        ref={fileInputRef}
                        id="trainer-cv"
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={handleCvChange}
                        disabled={isUploading}
                        required={!data.cvUrl && !data.cvFile}
                        aria-required={!data.cvUrl && !data.cvFile}
                        aria-describedby="trainer-cv-hint trainer-cv-status trainer-cv-error"
                        className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                )}

                {/* ── Uploading: progress bar ─────────────────────────────── */}
                {isUploading && (
                    <ProgressBar progress={progress} label="CV upload progress" />
                )}

                {/* ── Success: confirmation + swap option ────────────────── */}
                {(isSuccess || hasPriorCv) && (
                    <div className="mt-2 flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        {/* Green checkmark icon */}
                        <svg
                            className="h-5 w-5 text-green-600 flex-shrink-0"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                        >
                            <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <span className="text-sm text-green-800 flex-1 truncate">
                            {isSuccess
                                ? `Uploaded: ${data.cvFile?.name ?? 'CV'}`
                                : 'Using previously uploaded CV'}
                        </span>
                        <button
                            type="button"
                            onClick={handleRemoveCv}
                            className="text-xs text-red-600 hover:text-red-800 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded flex-shrink-0"
                            aria-label="Remove CV and choose a different file"
                        >
                            Remove
                        </button>
                    </div>
                )}

                {/* ── ARIA live region — read aloud by screen readers ────── */}
                {/*
                  aria-live="polite" → announces after the current speech finishes.
                  aria-atomic="true" → reads the full message, not just the changed part.
                  The visually hidden region is always in the DOM so the browser
                  registers its live region role before the first update fires.
                */}
                <p
                    id="trainer-cv-status"
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                    className="sr-only"
                >
                    {liveMessage}
                </p>

                {/* ── Static hint ────────────────────────────────────────── */}
                <p id="trainer-cv-hint" className="mt-1 text-xs text-gray-500">
                    PDF only. Maximum file size: 5 MB.
                </p>

                {/* ── Validation error from parent ───────────────────────── */}
                {errors?.cv && (
                    <p id="trainer-cv-error" className="mt-1 text-xs text-red-600" role="alert">
                        {errors.cv}
                    </p>
                )}
            </div>
        </div>
    );
}
