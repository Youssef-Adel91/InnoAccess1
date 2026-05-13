import React from 'react';

interface TrainerRegistrationFormProps {
    data: {
        bio: string;
        specialization: string;
        linkedInUrl: string;
        websiteUrl: string;
        cvFile: File | null;
        cvUrl?: string; // For existing data
    };
    onChange: (field: string, value: any) => void;
    errors?: {
        bio?: string;
        specialization?: string;
        cv?: string;
    };
}

export default function TrainerRegistrationForm({ data, onChange, errors }: TrainerRegistrationFormProps) {
    const handleCvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Simple client-side validation, parent can do more strict checks
        if (file.type !== 'application/pdf') {
            onChange('cvError', 'Please upload a PDF file'); // Or handle via parent error prop
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            onChange('cvError', 'CV file size must be less than 5MB');
            return;
        }

        onChange('cvFile', file);
        onChange('cvError', null);
    };

    return (
        <div className="space-y-6 border-t pt-6 mt-6" role="group" aria-labelledby="trainer-info-heading">
            <h3 id="trainer-info-heading" className="text-lg font-medium text-gray-900">Trainer Information</h3>
            <p id="trainer-info-desc" className="text-sm text-gray-500">
                Please provide your professional details for admin review.
            </p>

            {/* Bio */}
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

            {/* Specialization */}
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

            {/* LinkedIn URL */}
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

            {/* Website URL */}
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

            {/* CV Upload */}
            <div>
                <label htmlFor="trainer-cv" className="block text-sm font-medium text-gray-700 mb-2">
                    CV / Resume (PDF only)
                    <span aria-hidden="true"> *</span>
                    <span className="sr-only"> (required)</span>
                </label>
                <input
                    id="trainer-cv"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleCvUpload}
                    required={!data.cvUrl && !data.cvFile}
                    aria-required={!data.cvUrl && !data.cvFile}
                    aria-describedby="trainer-cv-hint trainer-cv-error"
                    className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                />
                {data.cvFile && (
                    <p className="mt-2 text-sm text-green-600" role="status" aria-live="polite">
                        <span className="sr-only">File selected: </span>
                        ✓ {data.cvFile.name}
                    </p>
                )}
                {data.cvUrl && !data.cvFile && (
                    <p className="mt-2 text-sm text-gray-600">
                        Using previously uploaded CV
                    </p>
                )}
                <p id="trainer-cv-hint" className="mt-1 text-xs text-gray-500">
                    PDF only. Maximum file size: 5MB
                </p>
                {errors?.cv && (
                    <p id="trainer-cv-error" className="mt-1 text-xs text-red-600" role="alert">
                        {errors.cv}
                    </p>
                )}
            </div>
        </div>
    );
}
