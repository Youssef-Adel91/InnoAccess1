'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, type FieldArrayWithId, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, ChevronUp, ChevronDown, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { educationsSchema } from '@/lib/resumeSchemas';
import { useResumeStore, useResumeDraft } from '@/store/useResumeStore';
import type { EducationDraft } from '@/store/useResumeStore';
import { stopBackspacePropagation } from '@/lib/keyboardUtils';
import { LiveRegion, type LiveRegionHandle } from '../LiveRegion';
import { useStepHeadingRef } from '../ResumeBuilderLayout';

type EducationsForm = {
    educations: {
        clientId:     string;
        institution:  string;
        degree:       string;
        fieldOfStudy: string;
        startDate:    string;
        endDate:      string;
        grade:        string;
        description:  string;
    }[];
};

type EducationField = FieldArrayWithId<EducationsForm, 'educations', '_rhfId'>;

const inputBase =
    'block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm shadow-sm transition-colors duration-150 ' +
    'min-h-[44px] placeholder-gray-400 ' +
    'focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none ' +
    'aria-[invalid=true]:border-red-400 aria-[invalid=true]:ring-red-400';

const labelBase = 'block text-sm font-semibold text-gray-700 mb-1';

function createEmptyEducation(): EducationDraft {
    return {
        clientId:     crypto.randomUUID(),
        institution:  '',
        degree:       '',
        fieldOfStudy: '',
        startDate:    '',
        endDate:      '',
        grade:        '',
        description:  '',
    };
}

interface EducationCardProps {
    field:      EducationField;
    index:      number;
    total:      number;
    form:       UseFormReturn<EducationsForm>;
    firstInputRef?: React.MutableRefObject<HTMLInputElement | null>;
    onRemove:   () => void;
    onMoveUp:   () => void;
    onMoveDown: () => void;
}

function EducationCard({
    index,
    total,
    form,
    firstInputRef,
    onRemove,
    onMoveUp,
    onMoveDown,
}: EducationCardProps) {
    const { register, watch, formState: { errors } } = form;
    const prefix = `educations.${index}` as const;
    const eduErrors = errors.educations?.[index];

    return (
        <div
            role="group"
            aria-label={`Education ${index + 1} of ${total}`}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
        >
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <span
                        className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold"
                        aria-hidden="true"
                    >
                        {index + 1}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">
                        Education {index + 1}
                        {watch(`${prefix}.institution`) && (
                            <span className="font-normal text-gray-400 ml-1">
                                — {watch(`${prefix}.institution`)}
                            </span>
                        )}
                    </span>
                </div>

                <div className="flex items-center gap-1" role="group" aria-label={`Controls for education ${index + 1}`}>
                    <button
                        type="button"
                        onClick={onMoveUp}
                        disabled={index === 0}
                        aria-label={`Move up to position ${index}`}
                        className={cn(
                            'p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600',
                            'min-h-[44px] min-w-[44px] flex items-center justify-center',
                            index === 0 && 'opacity-30 cursor-not-allowed',
                        )}
                    >
                        <ChevronUp className="h-4 w-4" aria-hidden="true" />
                    </button>

                    <button
                        type="button"
                        onClick={onMoveDown}
                        disabled={index === total - 1}
                        aria-label={`Move down to position ${index + 2}`}
                        className={cn(
                            'p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600',
                            'min-h-[44px] min-w-[44px] flex items-center justify-center',
                            index === total - 1 && 'opacity-30 cursor-not-allowed',
                        )}
                    >
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    </button>

                    <button
                        type="button"
                        onClick={onRemove}
                        aria-label={`Remove education ${index + 1}`}
                        className={cn(
                            'p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500',
                            'min-h-[44px] min-w-[44px] flex items-center justify-center',
                        )}
                    >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>
            </div>

            <input type="hidden" {...register(`${prefix}.clientId`)} />

            <div className="mb-4">
                <label htmlFor={`${prefix}.institution`} className={labelBase}>
                    Institution Name <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                {(() => {
                    const { ref: rhfRef, ...rhfProps } = register(`${prefix}.institution`);
                    return (
                        <input
                            id={`${prefix}.institution`}
                            type="text"
                            placeholder="e.g. Cairo University"
                            aria-required="true"
                            aria-invalid={!!eduErrors?.institution}
                            aria-describedby={eduErrors?.institution ? `${prefix}.institution-error` : undefined}
                            {...rhfProps}
                            ref={(el) => {
                                rhfRef(el);
                                if (firstInputRef) firstInputRef.current = el;
                            }}
                            className={inputBase}
                        />
                    );
                })()}
                {eduErrors?.institution && (
                    <p id={`${prefix}.institution-error`} role="alert" className="mt-1 text-xs text-red-600">
                        {eduErrors.institution.message}
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                    <label htmlFor={`${prefix}.degree`} className={labelBase}>
                        Degree <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                        id={`${prefix}.degree`}
                        type="text"
                        placeholder="e.g. Bachelor's"
                        aria-required="true"
                        aria-invalid={!!eduErrors?.degree}
                        aria-describedby={eduErrors?.degree ? `${prefix}.degree-error` : undefined}
                        {...register(`${prefix}.degree`)}
                        className={inputBase}
                    />
                    {eduErrors?.degree && (
                        <p id={`${prefix}.degree-error`} role="alert" className="mt-1 text-xs text-red-600">
                            {eduErrors.degree.message}
                        </p>
                    )}
                </div>

                <div>
                    <label htmlFor={`${prefix}.fieldOfStudy`} className={labelBase}>
                        Field of Study <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                        id={`${prefix}.fieldOfStudy`}
                        type="text"
                        placeholder="e.g. Computer Science"
                        aria-required="true"
                        aria-invalid={!!eduErrors?.fieldOfStudy}
                        aria-describedby={eduErrors?.fieldOfStudy ? `${prefix}.fieldOfStudy-error` : undefined}
                        {...register(`${prefix}.fieldOfStudy`)}
                        className={inputBase}
                    />
                    {eduErrors?.fieldOfStudy && (
                        <p id={`${prefix}.fieldOfStudy-error`} role="alert" className="mt-1 text-xs text-red-600">
                            {eduErrors.fieldOfStudy.message}
                        </p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                    <label htmlFor={`${prefix}.startDate`} className={labelBase}>
                        Start Date <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                        id={`${prefix}.startDate`}
                        type="text"
                        placeholder="MM/YYYY"
                        aria-required="true"
                        aria-invalid={!!eduErrors?.startDate}
                        aria-describedby={eduErrors?.startDate ? `${prefix}.startDate-error` : undefined}
                        {...register(`${prefix}.startDate`)}
                        className={inputBase}
                    />
                    {eduErrors?.startDate && (
                        <p id={`${prefix}.startDate-error`} role="alert" className="mt-1 text-xs text-red-600">
                            {eduErrors.startDate.message}
                        </p>
                    )}
                </div>

                <div>
                    <label htmlFor={`${prefix}.endDate`} className={labelBase}>
                        End Date
                    </label>
                    <input
                        id={`${prefix}.endDate`}
                        type="text"
                        placeholder="MM/YYYY"
                        aria-invalid={!!eduErrors?.endDate}
                        aria-describedby={eduErrors?.endDate ? `${prefix}.endDate-error` : undefined}
                        {...register(`${prefix}.endDate`)}
                        className={inputBase}
                    />
                    {eduErrors?.endDate && (
                        <p id={`${prefix}.endDate-error`} role="alert" className="mt-1 text-xs text-red-600">
                            {eduErrors.endDate.message}
                        </p>
                    )}
                </div>

                <div>
                    <label htmlFor={`${prefix}.grade`} className={labelBase}>
                        Grade / GPA
                    </label>
                    <input
                        id={`${prefix}.grade`}
                        type="text"
                        placeholder="e.g. 3.8/4.0 or Excellent"
                        {...register(`${prefix}.grade`)}
                        className={inputBase}
                    />
                </div>
            </div>

            <div>
                <label htmlFor={`${prefix}.description`} className={labelBase}>
                    Description / Honors
                </label>
                <textarea
                    id={`${prefix}.description`}
                    rows={3}
                    placeholder="e.g. Graduated with Honors. Relevant Coursework: Data Structures..."
                    onKeyDown={(e) => stopBackspacePropagation(e as unknown as React.KeyboardEvent<HTMLInputElement>)}
                    {...register(`${prefix}.description`)}
                    className={cn(inputBase, 'resize-y min-h-[80px]')}
                />
            </div>
        </div>
    );
}

export function EducationStep() {
    const draft                = useResumeDraft();
    const { setEducations, goToNextStep } = useResumeStore();
    const registerHeadingRef   = useStepHeadingRef();

    const liveRegionRef    = useRef<LiveRegionHandle>(null);
    const addButtonRef     = useRef<HTMLButtonElement>(null);
    const newEntryFocusRef = useRef<HTMLInputElement | null>(null);
    const removeRef        = useRef<{ index: number; institution: string } | null>(null);
    const moveRef          = useRef<{ toIndex: number; direction: 'up' | 'down' } | null>(null);

    const form = useForm<EducationsForm>({
        resolver:      zodResolver(educationsSchema) as unknown as import('react-hook-form').Resolver<EducationsForm>,
        defaultValues: {
            educations: draft.educations.length > 0
                ? draft.educations
                : [],
        },
        mode: 'onSubmit',
    });

    const { fields, append, remove, swap } = useFieldArray({
        control: form.control,
        name:    'educations',
        keyName: '_rhfId',
    });

    const prevLengthRef = useRef(fields.length);
    const prevOrderRef  = useRef<string[]>(fields.map((f) => f.clientId));

    useEffect(() => {
        if (fields.length > prevLengthRef.current) {
            requestAnimationFrame(() => {
                newEntryFocusRef.current?.focus();
            });
            liveRegionRef.current?.announce(
                `New education added. Entry ${fields.length} of ${fields.length}. Complete the fields below.`
            );
        }
        prevLengthRef.current = fields.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fields.length]);

    useEffect(() => {
        if (removeRef.current !== null && fields.length < prevLengthRef.current) {
            const { institution } = removeRef.current;
            const remaining       = fields.length;
            const label           = institution ? `Education at ${institution}` : 'Education';

            liveRegionRef.current?.announce(
                remaining > 0
                    ? `${label} removed. ${remaining} ${remaining === 1 ? 'entry' : 'entries'} remaining.`
                    : `${label} removed. No entries remaining.`
            );

            requestAnimationFrame(() => {
                addButtonRef.current?.focus();
            });

            removeRef.current       = null;
            prevLengthRef.current   = fields.length;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fields]);

    useEffect(() => {
        const currentOrder = fields.map((f) => f.clientId);
        if (
            moveRef.current !== null &&
            JSON.stringify(currentOrder) !== JSON.stringify(prevOrderRef.current)
        ) {
            const { toIndex } = moveRef.current;
            const institution = form.getValues(`educations.${toIndex}.institution`);
            const label       = institution || `Education ${toIndex + 1}`;

            liveRegionRef.current?.announce(
                `${label} moved to position ${toIndex + 1} of ${fields.length}.`
            );

            moveRef.current = null;
        }
        prevOrderRef.current = currentOrder;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fields]);

    const handleAdd = useCallback(() => {
        append(createEmptyEducation());
    }, [append]);

    const handleRemove = useCallback((index: number) => {
        const institution = form.getValues(`educations.${index}.institution`);
        removeRef.current = { index, institution };
        remove(index);
    }, [form, remove]);

    const handleMove = useCallback((index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= fields.length) return;
        moveRef.current = { toIndex: targetIndex, direction };
        swap(index, targetIndex);
    }, [fields.length, swap]);

    const onSubmit = (data: EducationsForm) => {
        setEducations(data.educations as EducationDraft[]);
        goToNextStep();
    };

    return (
        <section aria-labelledby="step-heading">
            <LiveRegion ref={liveRegionRef} politeness="polite" />

            <h2
                id="step-heading"
                ref={registerHeadingRef}
                tabIndex={-1}
                className="text-2xl font-bold text-gray-900 mb-1 focus:outline-none"
            >
                Education
            </h2>
            <p className="text-sm text-gray-500 mb-6">
                List your academic background, starting with your highest degree.
            </p>

            <form
                id="resume-step-form"
                onSubmit={form.handleSubmit(onSubmit)}
                noValidate
                aria-label="Education form"
            >
                <div
                    className="space-y-6"
                    role="list"
                    aria-label={`Education entries (${fields.length} total)`}
                >
                    {fields.length === 0 && (
                        <div className="text-center py-12 rounded-2xl border-2 border-dashed border-gray-200">
                            <GraduationCap className="h-10 w-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
                            <p className="text-gray-400 text-sm">No education added yet.</p>
                            <p className="text-gray-400 text-sm">Click "Add Education" below to get started.</p>
                        </div>
                    )}

                    {fields.map((field, index) => (
                        <div key={field._rhfId} role="listitem">
                            <EducationCard
                                field={field}
                                index={index}
                                total={fields.length}
                                form={form}
                                firstInputRef={index === fields.length - 1 ? newEntryFocusRef : undefined}
                                onRemove={()           => handleRemove(index)}
                                onMoveUp={()           => handleMove(index, 'up')}
                                onMoveDown={()         => handleMove(index, 'down')}
                            />
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    ref={addButtonRef}
                    onClick={handleAdd}
                    aria-label="Add a new education entry"
                    className={cn(
                        'mt-6 w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl',
                        'border-2 border-dashed border-blue-300 text-blue-600',
                        'hover:border-blue-500 hover:bg-blue-50 transition-all duration-150',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2',
                        'font-semibold text-sm min-h-[52px]',
                    )}
                >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add Education
                </button>
            </form>
        </section>
    );
}
