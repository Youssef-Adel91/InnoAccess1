'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { summarySchema, type SummaryFormData } from '@/lib/resumeSchemas';
import { useResumeStore, useResumeDraft } from '@/store/useResumeStore';
import { stopBackspacePropagation } from '@/lib/keyboardUtils';
import { useStepHeadingRef } from '../ResumeBuilderLayout';
import { cn } from '@/lib/utils';
import { FileText } from 'lucide-react';

export function SummaryStep() {
    const draft           = useResumeDraft();
    const { setSummary, goToNextStep } = useResumeStore();
    const registerHeadingRef = useStepHeadingRef();

    const {
        register,
        handleSubmit,
        formState: { errors },
        setFocus,
        watch,
    } = useForm<SummaryFormData>({
        resolver:      zodResolver(summarySchema),
        defaultValues: { summary: draft.summary || '' },
    });

    const summaryValue = watch('summary');
    const charCount    = summaryValue ? summaryValue.length : 0;
    const maxChars     = 600;

    useEffect(() => {
        if (errors.summary) setFocus('summary');
    }, [errors, setFocus]);

    const onSubmit = (data: SummaryFormData) => {
        setSummary(data.summary || '');
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
                Professional Summary
            </h2>
            <p className="text-sm text-gray-500 mb-8">
                Write a brief 2-4 sentence summary of your professional background, key skills, and career goals.
            </p>

            <form
                id="resume-step-form"
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                aria-label="Professional summary form"
            >
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <label
                        htmlFor="summary-textarea"
                        className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                    >
                        <FileText className="h-4 w-4 text-gray-400" aria-hidden="true" />
                        Summary <span className="text-red-500" aria-hidden="true">*</span>
                    </label>

                    <p id="summary-hint" className="text-xs text-gray-400 mb-3">
                        Focus on your most relevant achievements and what value you bring to a role.
                    </p>

                    <textarea
                        id="summary-textarea"
                        rows={6}
                        placeholder="e.g. Dedicated Software Engineer with 5+ years of experience in building scalable web applications. Proficient in React and Node.js..."
                        aria-required="true"
                        aria-invalid={!!errors.summary}
                        aria-describedby={[
                            errors.summary ? 'summary-error' : '',
                            'summary-hint',
                            'summary-counter'
                        ].filter(Boolean).join(' ') || undefined}
                        onKeyDown={(e) => stopBackspacePropagation(e as unknown as React.KeyboardEvent<HTMLInputElement>)}
                        {...register('summary')}
                        className={cn(
                            'block w-full rounded-xl border px-4 py-3 text-sm shadow-sm transition-colors duration-150',
                            'resize-y min-h-[120px] placeholder-gray-400 focus:outline-none',
                            errors.summary
                                ? 'border-red-400 focus:ring-2 focus:ring-red-400'
                                : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
                        )}
                    />

                    <div className="flex items-start justify-between mt-2">
                        <div>
                            {errors.summary && (
                                <p
                                    id="summary-error"
                                    role="alert"
                                    aria-live="polite"
                                    className="text-xs text-red-600 flex items-center gap-1"
                                >
                                    <span aria-hidden="true">⚠</span>
                                    {errors.summary.message}
                                </p>
                            )}
                        </div>
                        <span
                            id="summary-counter"
                            className={cn(
                                'text-xs font-medium',
                                charCount > maxChars ? 'text-red-500' : 'text-gray-400'
                            )}
                            aria-live="polite"
                        >
                            {charCount} / {maxChars}
                        </span>
                    </div>
                </div>
            </form>
        </section>
    );
}
