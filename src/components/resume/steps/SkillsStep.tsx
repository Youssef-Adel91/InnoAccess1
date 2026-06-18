'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, type FieldArrayWithId, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, ChevronUp, ChevronDown, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { skillsSchema, skillLevels } from '@/lib/resumeSchemas';
import { useResumeStore, useResumeDraft } from '@/store/useResumeStore';
import type { SkillDraft } from '@/store/useResumeStore';
import { LiveRegion, type LiveRegionHandle } from '../LiveRegion';
import { useStepHeadingRef } from '../ResumeBuilderLayout';

type SkillsForm = {
    skills: {
        clientId: string;
        name:     string;
        level:    'beginner' | 'intermediate' | 'advanced' | 'expert';
    }[];
};

type SkillField = FieldArrayWithId<SkillsForm, 'skills', '_rhfId'>;

const inputBase =
    'block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm shadow-sm transition-colors duration-150 ' +
    'min-h-[44px] placeholder-gray-400 ' +
    'focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none ' +
    'aria-[invalid=true]:border-red-400 aria-[invalid=true]:ring-red-400';

const labelBase = 'block text-sm font-semibold text-gray-700 mb-1';

function createEmptySkill(): SkillDraft {
    return {
        clientId: crypto.randomUUID(),
        name:     '',
        level:    'intermediate',
    };
}

interface SkillCardProps {
    field:      SkillField;
    index:      number;
    total:      number;
    form:       UseFormReturn<SkillsForm>;
    firstInputRef?: React.MutableRefObject<HTMLInputElement | null>;
    onRemove:   () => void;
    onMoveUp:   () => void;
    onMoveDown: () => void;
}

function SkillCard({
    index,
    total,
    form,
    firstInputRef,
    onRemove,
    onMoveUp,
    onMoveDown,
}: SkillCardProps) {
    const { register, watch, formState: { errors } } = form;
    const prefix = `skills.${index}` as const;
    const skillErrors = errors.skills?.[index];

    return (
        <div
            role="group"
            aria-label={`Skill ${index + 1} of ${total}`}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center"
        >
            <div className="flex-1 w-full flex items-start sm:items-center gap-4">
                {/* Number indicator */}
                <span
                    className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold mt-1 sm:mt-0"
                    aria-hidden="true"
                >
                    {index + 1}
                </span>

                <input type="hidden" {...register(`${prefix}.clientId`)} />

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                    <div>
                        <label htmlFor={`${prefix}.name`} className="sr-only">Skill Name</label>
                        {(() => {
                            const { ref: rhfRef, ...rhfProps } = register(`${prefix}.name`);
                            return (
                                <input
                                    id={`${prefix}.name`}
                                    type="text"
                                    placeholder="e.g. React.js"
                                    aria-required="true"
                                    aria-label="Skill Name"
                                    aria-invalid={!!skillErrors?.name}
                                    aria-describedby={skillErrors?.name ? `${prefix}.name-error` : undefined}
                                    {...rhfProps}
                                    ref={(el) => {
                                        rhfRef(el);
                                        if (firstInputRef) firstInputRef.current = el;
                                    }}
                                    className={inputBase}
                                />
                            );
                        })()}
                        {skillErrors?.name && (
                            <p id={`${prefix}.name-error`} role="alert" className="mt-1 text-xs text-red-600">
                                {skillErrors.name.message}
                            </p>
                        )}
                    </div>

                    <div>
                        <label htmlFor={`${prefix}.level`} className="sr-only">Skill Level</label>
                        <select
                            id={`${prefix}.level`}
                            aria-required="true"
                            aria-label="Skill Level"
                            aria-invalid={!!skillErrors?.level}
                            aria-describedby={skillErrors?.level ? `${prefix}.level-error` : undefined}
                            {...register(`${prefix}.level`)}
                            className={cn(inputBase, 'bg-white appearance-none pr-10')}
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                backgroundPosition: 'right 0.5rem center',
                                backgroundRepeat: 'no-repeat',
                                backgroundSize: '1.5em 1.5em',
                            }}
                        >
                            {skillLevels.map((level) => (
                                <option key={level} value={level}>
                                    {level.charAt(0).toUpperCase() + level.slice(1)}
                                </option>
                            ))}
                        </select>
                        {skillErrors?.level && (
                            <p id={`${prefix}.level-error`} role="alert" className="mt-1 text-xs text-red-600">
                                {skillErrors.level.message}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1 sm:ml-auto w-full sm:w-auto justify-end mt-2 sm:mt-0">
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
                    aria-label={`Remove skill ${index + 1}`}
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
    );
}

export function SkillsStep() {
    const draft                = useResumeDraft();
    const { setSkills, goToNextStep } = useResumeStore();
    const registerHeadingRef   = useStepHeadingRef();

    const liveRegionRef    = useRef<LiveRegionHandle>(null);
    const addButtonRef     = useRef<HTMLButtonElement>(null);
    const newEntryFocusRef = useRef<HTMLInputElement | null>(null);
    const removeRef        = useRef<{ index: number; name: string } | null>(null);
    const moveRef          = useRef<{ toIndex: number; direction: 'up' | 'down' } | null>(null);

    const form = useForm<SkillsForm>({
        resolver:      zodResolver(skillsSchema) as unknown as import('react-hook-form').Resolver<SkillsForm>,
        defaultValues: {
            skills: draft.skills.length > 0
                ? draft.skills
                : [],
        },
        mode: 'onSubmit',
    });

    const { fields, append, remove, swap } = useFieldArray({
        control: form.control,
        name:    'skills',
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
                `New skill added. Entry ${fields.length} of ${fields.length}.`
            );
        }
        prevLengthRef.current = fields.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fields.length]);

    useEffect(() => {
        if (removeRef.current !== null && fields.length < prevLengthRef.current) {
            const { name }  = removeRef.current;
            const remaining = fields.length;
            const label     = name ? `Skill "${name}"` : 'Skill';

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
            const name        = form.getValues(`skills.${toIndex}.name`);
            const label       = name || `Skill ${toIndex + 1}`;

            liveRegionRef.current?.announce(
                `${label} moved to position ${toIndex + 1} of ${fields.length}.`
            );

            moveRef.current = null;
        }
        prevOrderRef.current = currentOrder;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fields]);

    const handleAdd = useCallback(() => {
        append(createEmptySkill());
    }, [append]);

    const handleRemove = useCallback((index: number) => {
        const name = form.getValues(`skills.${index}.name`);
        removeRef.current = { index, name };
        remove(index);
    }, [form, remove]);

    const handleMove = useCallback((index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= fields.length) return;
        moveRef.current = { toIndex: targetIndex, direction };
        swap(index, targetIndex);
    }, [fields.length, swap]);

    const onSubmit = (data: SkillsForm) => {
        setSkills(data.skills as SkillDraft[]);
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
                Skills
            </h2>
            <p className="text-sm text-gray-500 mb-6">
                Add your technical and professional skills.
            </p>

            <form
                id="resume-step-form"
                onSubmit={form.handleSubmit(onSubmit)}
                noValidate
                aria-label="Skills form"
            >
                {form.formState.errors.skills?.root && (
                    <div role="alert" className="mb-4 p-4 rounded-xl bg-red-50 text-red-600 text-sm font-medium">
                        {form.formState.errors.skills.root.message}
                    </div>
                )}
                
                <div
                    className="space-y-4"
                    role="list"
                    aria-label={`Skill entries (${fields.length} total)`}
                >
                    {fields.length === 0 && (
                        <div className="text-center py-12 rounded-2xl border-2 border-dashed border-gray-200">
                            <Wrench className="h-10 w-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
                            <p className="text-gray-400 text-sm">No skills added yet.</p>
                            <p className="text-gray-400 text-sm">Click "Add Skill" below.</p>
                        </div>
                    )}

                    {fields.map((field, index) => (
                        <div key={field._rhfId} role="listitem">
                            <SkillCard
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
                    aria-label="Add a new skill"
                    className={cn(
                        'mt-6 w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl',
                        'border-2 border-dashed border-blue-300 text-blue-600',
                        'hover:border-blue-500 hover:bg-blue-50 transition-all duration-150',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2',
                        'font-semibold text-sm min-h-[52px]',
                    )}
                >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add Skill
                </button>
            </form>
        </section>
    );
}
