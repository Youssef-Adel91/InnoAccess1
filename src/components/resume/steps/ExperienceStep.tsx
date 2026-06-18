'use client';

import {
    useRef,
    useEffect,
    useCallback,
} from 'react';
import { useForm, useFieldArray, type FieldArrayWithId, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, ChevronUp, ChevronDown, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { experiencesSchema, type ExperiencesFormData } from '@/lib/resumeSchemas';
import { useResumeStore, useResumeDraft } from '@/store/useResumeStore';
import type { WorkExperienceDraft } from '@/store/useResumeStore';
import { stopBackspacePropagation } from '@/lib/keyboardUtils';
import { LiveRegion, type LiveRegionHandle } from '../LiveRegion';
import { useStepHeadingRef } from '../ResumeBuilderLayout';

type ExperiencesForm = {
    experiences: {
        clientId:    string;
        jobTitle:    string;
        company:     string;
        location:    string;
        startDate:   string;
        endDate:     string;
        isCurrent:   boolean;
        description: string;
    }[];
};

type ExperienceField = FieldArrayWithId<ExperiencesForm, 'experiences', '_rhfId'>;


// ─── Shared input styles ──────────────────────────────────────────────────────

const inputBase =
    'block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm shadow-sm transition-colors duration-150 ' +
    'min-h-[44px] placeholder-gray-400 ' +
    'focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none ' +
    'aria-[invalid=true]:border-red-400 aria-[invalid=true]:ring-red-400';

const labelBase = 'block text-sm font-semibold text-gray-700 mb-1';

// ─── Empty work experience factory ───────────────────────────────────────────

function createEmptyExperience(): WorkExperienceDraft {
    return {
        clientId:    crypto.randomUUID(),
        jobTitle:    '',
        company:     '',
        location:    '',
        startDate:   '',
        endDate:     '',
        isCurrent:   false,
        description: '',
    };
}

// ─── Single experience card ───────────────────────────────────────────────────

interface ExperienceCardProps {
    field:      ExperienceField;
    index:      number;
    total:      number;
    form:       UseFormReturn<ExperiencesForm>;
    firstInputRef?: React.MutableRefObject<HTMLInputElement | null>;
    onRemove:   () => void;
    onMoveUp:   () => void;
    onMoveDown: () => void;
}

function ExperienceCard({
    field,
    index,
    total,
    form,
    firstInputRef,
    onRemove,
    onMoveUp,
    onMoveDown,
}: ExperienceCardProps) {
    const { register, watch, setValue, formState: { errors } } = form;
    const prefix = `experiences.${index}` as const;
    const expErrors = errors.experiences?.[index];
    const isCurrent = watch(`${prefix}.isCurrent`);

    return (
        <div
            role="group"
            aria-label={`Work experience ${index + 1} of ${total}`}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
        >
            {/* Card header: position label + reorder + remove controls */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <span
                        className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold"
                        aria-hidden="true"
                    >
                        {index + 1}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">
                        Experience {index + 1}
                        {watch(`${prefix}.jobTitle`) && (
                            <span className="font-normal text-gray-400 ml-1">
                                — {watch(`${prefix}.jobTitle`)}
                                {watch(`${prefix}.company`) && ` at ${watch(`${prefix}.company`)}`}
                            </span>
                        )}
                    </span>
                </div>

                <div className="flex items-center gap-1" role="group" aria-label={`Controls for experience ${index + 1}`}>
                    {/* Move Up */}
                    <button
                        type="button"
                        onClick={onMoveUp}
                        disabled={index === 0}
                        aria-label={`Move experience ${index + 1} up to position ${index}`}
                        className={cn(
                            'p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600',
                            'min-h-[44px] min-w-[44px] flex items-center justify-center',
                            index === 0 && 'opacity-30 cursor-not-allowed',
                        )}
                    >
                        <ChevronUp className="h-4 w-4" aria-hidden="true" />
                    </button>

                    {/* Move Down */}
                    <button
                        type="button"
                        onClick={onMoveDown}
                        disabled={index === total - 1}
                        aria-label={`Move experience ${index + 1} down to position ${index + 2}`}
                        className={cn(
                            'p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600',
                            'min-h-[44px] min-w-[44px] flex items-center justify-center',
                            index === total - 1 && 'opacity-30 cursor-not-allowed',
                        )}
                    >
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    </button>

                    {/* Remove */}
                    <button
                        type="button"
                        onClick={onRemove}
                        aria-label={`Remove experience ${index + 1}${watch(`${prefix}.company`) ? `: ${watch(`${prefix}.company`)}` : ''}`}
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

            {/* Hidden clientId — submitted but not shown */}
            <input type="hidden" {...register(`${prefix}.clientId`)} />

            {/* ── Row 1: Job Title + Company ─────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                    <label htmlFor={`${prefix}.jobTitle`} className={labelBase}>
                        Job Title <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    {(() => {
                        const { ref: rhfRef, ...rhfProps } = register(`${prefix}.jobTitle`);
                        return (
                            <input
                                id={`${prefix}.jobTitle`}
                                type="text"
                                placeholder="e.g. Software Engineer"
                                autoComplete="organization-title"
                                aria-required="true"
                                aria-invalid={!!expErrors?.jobTitle}
                                aria-describedby={expErrors?.jobTitle ? `${prefix}.jobTitle-error` : undefined}
                                {...rhfProps}
                                ref={(el) => {
                                    rhfRef(el);
                                    if (firstInputRef) firstInputRef.current = el;
                                }}
                                className={inputBase}
                            />
                        );
                    })()}
                    {expErrors?.jobTitle && (
                        <p id={`${prefix}.jobTitle-error`} role="alert" className="mt-1 text-xs text-red-600">
                            {expErrors.jobTitle.message}
                        </p>
                    )}
                </div>

                <div>
                    <label htmlFor={`${prefix}.company`} className={labelBase}>
                        Company <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                        id={`${prefix}.company`}
                        type="text"
                        placeholder="e.g. Google"
                        autoComplete="organization"
                        aria-required="true"
                        aria-invalid={!!expErrors?.company}
                        aria-describedby={expErrors?.company ? `${prefix}.company-error` : undefined}
                        {...register(`${prefix}.company`)}
                        className={inputBase}
                    />
                    {expErrors?.company && (
                        <p id={`${prefix}.company-error`} role="alert" className="mt-1 text-xs text-red-600">
                            {expErrors.company.message}
                        </p>
                    )}
                </div>
            </div>

            {/* ── Row 2: Location ───────────────────────────────────────── */}
            <div className="mb-4">
                <label htmlFor={`${prefix}.location`} className={labelBase}>Location</label>
                <input
                    id={`${prefix}.location`}
                    type="text"
                    placeholder="e.g. Cairo, Egypt (or Remote)"
                    {...register(`${prefix}.location`)}
                    className={inputBase}
                />
            </div>

            {/* ── Row 3: Dates + isCurrent ──────────────────────────────── */}
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
                        aria-invalid={!!expErrors?.startDate}
                        aria-describedby={expErrors?.startDate ? `${prefix}.startDate-error` : undefined}
                        {...register(`${prefix}.startDate`)}
                        className={inputBase}
                    />
                    {expErrors?.startDate && (
                        <p id={`${prefix}.startDate-error`} role="alert" className="mt-1 text-xs text-red-600">
                            {expErrors.startDate.message}
                        </p>
                    )}
                </div>

                <div>
                    <label
                        htmlFor={`${prefix}.endDate`}
                        className={cn(labelBase, isCurrent && 'opacity-40')}
                    >
                        End Date
                    </label>
                    <input
                        id={`${prefix}.endDate`}
                        type="text"
                        placeholder="MM/YYYY"
                        disabled={isCurrent}
                        aria-disabled={isCurrent}
                        aria-invalid={!!expErrors?.endDate}
                        aria-describedby={expErrors?.endDate ? `${prefix}.endDate-error` : undefined}
                        {...register(`${prefix}.endDate`)}
                        className={cn(inputBase, isCurrent && 'opacity-40 bg-gray-50')}
                    />
                    {expErrors?.endDate && (
                        <p id={`${prefix}.endDate-error`} role="alert" className="mt-1 text-xs text-red-600">
                            {expErrors.endDate.message}
                        </p>
                    )}
                </div>

                <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            id={`${prefix}.isCurrent`}
                            type="checkbox"
                            aria-label="I currently work here"
                            {...register(`${prefix}.isCurrent`)}
                            onChange={(e) => {
                                register(`${prefix}.isCurrent`).onChange(e);
                                // Clear endDate when "Currently working here" is checked
                                if (e.target.checked) {
                                    setValue(`${prefix}.endDate`, '');
                                }
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Currently here</span>
                    </label>
                </div>
            </div>

            {/* ── Row 4: Description ────────────────────────────────────── */}
            <div>
                <label htmlFor={`${prefix}.description`} className={labelBase}>
                    Description / Responsibilities
                </label>
                <p id={`${prefix}.desc-hint`} className="text-xs text-gray-400 mb-1">
                    Use a new line for each bullet point. Example: "• Led a team of 5 engineers…"
                </p>
                <textarea
                    id={`${prefix}.description`}
                    rows={4}
                    placeholder="Describe your responsibilities, achievements, and impact..."
                    aria-describedby={`${prefix}.desc-hint`}
                    onKeyDown={(e) => stopBackspacePropagation(e as unknown as React.KeyboardEvent<HTMLInputElement>)}
                    {...register(`${prefix}.description`)}
                    className={cn(inputBase, 'resize-y min-h-[100px]')}
                />
            </div>
        </div>
    );
}

// ─── ExperienceStep ───────────────────────────────────────────────────────────

/**
 * ExperienceStep — Step 2 of the Resume Wizard
 *
 * ── a11y implementation ───────────────────────────────────────────────────────
 *
 * ADD experience:
 *   1. append() adds a new blank entry to useFieldArray
 *   2. newEntryFocusRef points to the job title input of the LAST entry
 *   3. useEffect watching fields.length moves focus to that input
 *   4. liveRegionRef.current.announce() fires: "New work experience added.
 *      Entry 3 of 3. Complete the fields below."
 *
 * REMOVE experience:
 *   1. removeRef.current records the index being removed BEFORE remove() fires
 *   2. remove() removes the entry from useFieldArray
 *   3. useEffect watching fields.length:
 *        - If entries remain: focus moves to the "Add Experience" button
 *        - liveRegionRef.announce(): "Work experience removed. 2 entries remaining."
 *        - If all removed: focus moves to the heading
 *
 * REORDER (Move Up / Move Down):
 *   1. swap() from useFieldArray reorders the entries
 *   2. movedToRef records the destination index
 *   3. useEffect watching fields order announces the new position:
 *      "Work experience moved to position 2 of 3."
 *   4. Focus returns to the "Move Up" or "Move Down" button at the new index
 *
 * FORM SUBMIT:
 *   On valid submission → merges experiences into Zustand → advances step
 *   On invalid → focus moves to first invalid field (RHF default)
 */
export function ExperienceStep() {
    const draft                = useResumeDraft();
    const { setExperiences, goToNextStep } = useResumeStore();
    const registerHeadingRef   = useStepHeadingRef();

    // ── a11y refs ──────────────────────────────────────────────────────────────
    const liveRegionRef   = useRef<LiveRegionHandle>(null);
    const addButtonRef    = useRef<HTMLButtonElement>(null);
    const newEntryFocusRef = useRef<HTMLInputElement | null>(null);
    const removeRef       = useRef<{ index: number; company: string } | null>(null);
    const moveRef         = useRef<{ toIndex: number; direction: 'up' | 'down' } | null>(null);

    // ── Form ───────────────────────────────────────────────────────────────────
    const form = useForm<ExperiencesForm>({
        resolver:      zodResolver(experiencesSchema) as unknown as import('react-hook-form').Resolver<ExperiencesForm>,
        defaultValues: {
            experiences: draft.experiences.length > 0
                ? draft.experiences.map((e) => ({ ...e, isCurrent: e.isCurrent ?? false }))
                : [],
        },
        mode: 'onSubmit',
    });

    const { fields, append, remove, swap } = useFieldArray({
        control: form.control,
        name:    'experiences',
        keyName: '_rhfId',
    });

    const prevLengthRef = useRef(fields.length);
    const prevOrderRef  = useRef<string[]>(fields.map((f) => f.clientId));

    // ── Effect: handle ADD ─────────────────────────────────────────────────────
    useEffect(() => {
        if (fields.length > prevLengthRef.current) {
            // A new entry was added — focus its first input
            requestAnimationFrame(() => {
                newEntryFocusRef.current?.focus();
            });
            liveRegionRef.current?.announce(
                `New work experience added. Entry ${fields.length} of ${fields.length}. Complete the fields below.`
            );
        }
        prevLengthRef.current = fields.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fields.length]);

    // ── Effect: handle REMOVE ──────────────────────────────────────────────────
    useEffect(() => {
        if (removeRef.current !== null && fields.length < prevLengthRef.current) {
            const { company } = removeRef.current;
            const remaining   = fields.length;
            const label       = company ? `Work experience at ${company}` : 'Work experience';

            liveRegionRef.current?.announce(
                remaining > 0
                    ? `${label} removed. ${remaining} ${remaining === 1 ? 'entry' : 'entries'} remaining.`
                    : `${label} removed. No entries remaining.`
            );

            // Move focus to Add button, or the heading if list is empty
            requestAnimationFrame(() => {
                addButtonRef.current?.focus();
            });

            removeRef.current       = null;
            prevLengthRef.current   = fields.length;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fields]);

    // ── Effect: handle MOVE ────────────────────────────────────────────────────
    useEffect(() => {
        const currentOrder = fields.map((f) => f.clientId);
        if (
            moveRef.current !== null &&
            JSON.stringify(currentOrder) !== JSON.stringify(prevOrderRef.current)
        ) {
            const { toIndex } = moveRef.current;
            const jobTitle = form.getValues(`experiences.${toIndex}.jobTitle`);
            const company  = form.getValues(`experiences.${toIndex}.company`);
            const label    = [jobTitle, company].filter(Boolean).join(' at ') || `Experience ${toIndex + 1}`;

            liveRegionRef.current?.announce(
                `${label} moved to position ${toIndex + 1} of ${fields.length}.`
            );

            moveRef.current = null;
        }
        prevOrderRef.current = currentOrder;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fields]);

    // ── Handlers ───────────────────────────────────────────────────────────────

    const handleAdd = useCallback(() => {
        const newExp = createEmptyExperience();
        append(newExp);
        // newEntryFocusRef will be attached to the last card's first input
        // The ADD effect fires and moves focus there
    }, [append]);

    const handleRemove = useCallback((index: number) => {
        const company = form.getValues(`experiences.${index}.company`);
        removeRef.current = { index, company };
        remove(index);
    }, [form, remove]);

    const handleMove = useCallback((index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= fields.length) return;
        moveRef.current = { toIndex: targetIndex, direction };
        swap(index, targetIndex);
    }, [fields.length, swap]);

    // ── Form submit ────────────────────────────────────────────────────────────

    const onSubmit = (data: ExperiencesForm) => {
        setExperiences(data.experiences as WorkExperienceDraft[]);
        goToNextStep();
    };

    return (
        <section aria-labelledby="step-heading">
            {/* a11y: polite live region for add/remove/move announcements */}
            <LiveRegion ref={liveRegionRef} politeness="polite" />

            <h2
                id="step-heading"
                ref={registerHeadingRef}
                tabIndex={-1}
                className="text-2xl font-bold text-gray-900 mb-1 focus:outline-none"
            >
                Work Experience
            </h2>
            <p className="text-sm text-gray-500 mb-6">
                Add your work history, starting with the most recent position.
                <br />
                Leave this section empty if you are a fresh graduate — you can always edit it later.
            </p>

            <form
                id="resume-step-form"
                onSubmit={form.handleSubmit(onSubmit)}
                noValidate
                aria-label="Work experience form"
            >
                {/* ── Entry list ─────────────────────────────────────────── */}
                <div
                    className="space-y-6"
                    role="list"
                    aria-label={`Work experience entries (${fields.length} total)`}
                >
                    {fields.length === 0 && (
                        <div className="text-center py-12 rounded-2xl border-2 border-dashed border-gray-200">
                            <Briefcase className="h-10 w-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
                            <p className="text-gray-400 text-sm">No work experience added yet.</p>
                            <p className="text-gray-400 text-sm">Click "Add Experience" below to get started.</p>
                        </div>
                    )}

                    {fields.map((field, index) => (
                        <div key={field._rhfId} role="listitem">
                            <ExperienceCard
                                field={field}
                                index={index}
                                total={fields.length}
                                form={form}
                                // Only the LAST card gets the focus ref so
                                // newly added entries are focused automatically
                                firstInputRef={index === fields.length - 1 ? newEntryFocusRef : undefined}
                                onRemove={()           => handleRemove(index)}
                                onMoveUp={()           => handleMove(index, 'up')}
                                onMoveDown={()         => handleMove(index, 'down')}
                            />
                        </div>
                    ))}
                </div>

                {/* ── Add button ─────────────────────────────────────────── */}
                <button
                    type="button"
                    ref={addButtonRef}
                    onClick={handleAdd}
                    aria-label="Add a new work experience entry"
                    className={cn(
                        'mt-6 w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl',
                        'border-2 border-dashed border-blue-300 text-blue-600',
                        'hover:border-blue-500 hover:bg-blue-50 transition-all duration-150',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2',
                        'font-semibold text-sm min-h-[52px]',
                    )}
                >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add Experience
                </button>
            </form>
        </section>
    );
}
