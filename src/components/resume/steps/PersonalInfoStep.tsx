'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { User, Mail, Phone, MapPin, Globe, Linkedin, Github, ExternalLink } from 'lucide-react';
import { personalInfoSchema, type PersonalInfoFormData } from '@/lib/resumeSchemas';
import { useResumeStore, useResumeDraft } from '@/store/useResumeStore';
import { stopBackspacePropagation } from '@/lib/keyboardUtils';
import { useStepHeadingRef } from '../ResumeBuilderLayout';

// ─── Field config ─────────────────────────────────────────────────────────────

type FieldKey = keyof PersonalInfoFormData;

interface FieldConfig {
    name:        FieldKey;
    label:       string;
    type?:       string;
    placeholder: string;
    Icon:        React.FC<{ className?: string }>;
    required?:   boolean;
    hint?:       string;
    autoComplete?: string;
}

const FIELDS: FieldConfig[] = [
    {
        name:         'fullName',
        label:        'Full Name',
        placeholder:  'e.g. Ahmed Mohamed',
        Icon:         User,
        required:     true,
        autoComplete: 'name',
    },
    {
        name:         'email',
        label:        'Email Address',
        type:         'email',
        placeholder:  'e.g. ahmed@example.com',
        Icon:         Mail,
        required:     true,
        autoComplete: 'email',
    },
    {
        name:         'phone',
        label:        'Phone Number',
        type:         'tel',
        placeholder:  'e.g. +20 10 1234 5678',
        Icon:         Phone,
        autoComplete: 'tel',
    },
    {
        name:        'location',
        label:       'Location',
        placeholder: 'e.g. Cairo, Egypt',
        Icon:        MapPin,
        hint:        'City and country shown on your resume',
    },
    {
        name:        'website',
        label:       'Personal Website',
        type:        'url',
        placeholder: 'https://yourwebsite.com',
        Icon:        Globe,
        hint:        'Include https://',
    },
    {
        name:        'linkedin',
        label:       'LinkedIn Profile URL',
        type:        'url',
        placeholder: 'https://linkedin.com/in/yourname',
        Icon:        Linkedin,
    },
    {
        name:        'github',
        label:       'GitHub Profile URL',
        type:        'url',
        placeholder: 'https://github.com/yourname',
        Icon:        Github,
    },
    {
        name:        'portfolio',
        label:       'Portfolio / Other Link',
        type:        'url',
        placeholder: 'https://your-portfolio.com',
        Icon:        ExternalLink,
    },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputBase =
    'block w-full rounded-xl border border-gray-300 pl-10 pr-4 py-3 text-sm shadow-sm ' +
    'transition-colors duration-150 min-h-[44px] ' +
    'placeholder-gray-400 ' +
    'focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none ' +
    'aria-[invalid=true]:border-red-400 aria-[invalid=true]:ring-red-400';

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * PersonalInfoStep — Step 0 of the Resume Wizard
 *
 * ── Form mechanics ────────────────────────────────────────────────────────────
 * Uses React Hook Form with a zodResolver. The form has id="resume-step-form"
 * so the "Continue" button in ResumeBuilderLayout (type="submit" form="resume-step-form")
 * triggers validation and submission without needing to be inside this <form>.
 *
 * On valid submission:
 *   1. Merges validated data into the Zustand draft via setPersonalInfo()
 *   2. Advances the wizard via goToNextStep() — which triggers focus shift
 *      in ResumeBuilderLayout to the next step's <h2>
 *
 * On invalid submission:
 *   Focus moves to the first invalid field automatically (RHF default).
 *   The layout's error live region (assertive) announces the error count.
 *
 * ── Pre-population ────────────────────────────────────────────────────────────
 * defaultValues are read from the Zustand draft, which was pre-seeded at
 * resume creation time with the user's name and email from their session.
 * This means Step 0 often arrives pre-filled — user just reviews and continues.
 */
export function PersonalInfoStep() {
    const draft           = useResumeDraft();
    const { setPersonalInfo, goToNextStep } = useResumeStore();
    const registerHeadingRef = useStepHeadingRef();

    const {
        register,
        handleSubmit,
        formState: { errors },
        setFocus,
    } = useForm<PersonalInfoFormData>({
        resolver:      zodResolver(personalInfoSchema),
        defaultValues: {
            fullName:  draft.personalInfo.fullName  || '',
            email:     draft.personalInfo.email     || '',
            phone:     draft.personalInfo.phone     || '',
            location:  draft.personalInfo.location  || '',
            website:   draft.personalInfo.website   || '',
            linkedin:  draft.personalInfo.linkedin  || '',
            github:    draft.personalInfo.github    || '',
            portfolio: draft.personalInfo.portfolio || '',
        },
    });

    // ── Validation error: focus first invalid field ────────────────────────────
    useEffect(() => {
        const firstError = Object.keys(errors)[0] as FieldKey | undefined;
        if (firstError) setFocus(firstError);
    }, [errors, setFocus]);

    const onSubmit = (data: PersonalInfoFormData) => {
        setPersonalInfo({
            fullName:  data.fullName,
            email:     data.email,
            phone:     data.phone     ?? '',
            location:  data.location  ?? '',
            website:   data.website   ?? '',
            linkedin:  data.linkedin  ?? '',
            github:    data.github    ?? '',
            portfolio: data.portfolio ?? '',
        });
        goToNextStep();
    };

    return (
        <section aria-labelledby="step-heading">
            <h2
                id="step-heading"
                ref={registerHeadingRef}
                tabIndex={-1}
                className="text-2xl font-bold text-gray-900 mb-1 focus:outline-none"
            >
                Personal Information
            </h2>
            <p className="text-sm text-gray-500 mb-8">
                This information appears at the top of your resume. Fields marked
                <span aria-hidden="true"> *</span>
                <span className="sr-only"> with an asterisk</span> are required.
            </p>

            <form
                id="resume-step-form"
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                aria-label="Personal information form"
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {FIELDS.map(({ name, label, type = 'text', placeholder, Icon, required, hint, autoComplete }) => {
                        const fieldError = errors[name];
                        const errorId    = `${name}-error`;
                        const hintId     = `${name}-hint`;

                        return (
                            <div key={name} className="flex flex-col gap-1">
                                <label
                                    htmlFor={name}
                                    className="text-sm font-semibold text-gray-700"
                                >
                                    {label}
                                    {required && (
                                        <span className="text-red-500 ml-1" aria-hidden="true">*</span>
                                    )}
                                </label>

                                <div className="relative">
                                    <span
                                        className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"
                                        aria-hidden="true"
                                    >
                                        <Icon className="h-4 w-4" />
                                    </span>
                                    <input
                                        id={name}
                                        type={type}
                                        placeholder={placeholder}
                                        autoComplete={autoComplete}
                                        aria-required={required}
                                        aria-invalid={!!fieldError}
                                        aria-describedby={[
                                            fieldError ? errorId : '',
                                            hint       ? hintId  : '',
                                        ].filter(Boolean).join(' ') || undefined}
                                        onKeyDown={type === 'password' ? stopBackspacePropagation : undefined}
                                        {...register(name)}
                                        className={inputBase}
                                    />
                                </div>

                                {hint && !fieldError && (
                                    <p id={hintId} className="text-xs text-gray-400">{hint}</p>
                                )}

                                {fieldError && (
                                    <p
                                        id={errorId}
                                        role="alert"
                                        aria-live="polite"
                                        className="text-xs text-red-600 flex items-center gap-1"
                                    >
                                        <span aria-hidden="true">⚠</span>
                                        {fieldError.message}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </form>
        </section>
    );
}
