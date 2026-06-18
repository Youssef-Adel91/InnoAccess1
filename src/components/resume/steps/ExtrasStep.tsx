'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, type FieldArrayWithId, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, ChevronUp, ChevronDown, Languages, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { extrasSchema, proficiencyLevels } from '@/lib/resumeSchemas';
import { useResumeStore, useResumeDraft } from '@/store/useResumeStore';
import type { LanguageDraft, CertificationDraft } from '@/store/useResumeStore';
import { LiveRegion, type LiveRegionHandle } from '../LiveRegion';
import { useStepHeadingRef } from '../ResumeBuilderLayout';

type ExtrasForm = {
    languages: {
        clientId:    string;
        name:        string;
        proficiency: 'basic' | 'conversational' | 'professional' | 'native';
    }[];
    certifications: {
        clientId:      string;
        name:          string;
        issuer:        string;
        issueDate:     string;
        expiryDate:    string;
        credentialId:  string;
        credentialUrl: string;
    }[];
};

const inputBase =
    'block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm shadow-sm transition-colors duration-150 ' +
    'min-h-[44px] placeholder-gray-400 ' +
    'focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none ' +
    'aria-[invalid=true]:border-red-400 aria-[invalid=true]:ring-red-400';

const labelBase = 'block text-sm font-semibold text-gray-700 mb-1';

function createEmptyLanguage(): LanguageDraft {
    return {
        clientId:    crypto.randomUUID(),
        name:        '',
        proficiency: 'conversational',
    };
}

function createEmptyCertification(): CertificationDraft {
    return {
        clientId:      crypto.randomUUID(),
        name:          '',
        issuer:        '',
        issueDate:     '',
        expiryDate:    '',
        credentialId:  '',
        credentialUrl: '',
    };
}

// ─── Language Card ─────────────────────────────────────────────────────────────

type LanguageField = FieldArrayWithId<ExtrasForm, 'languages', '_rhfId'>;

function LanguageCard({
    field,
    index,
    total,
    form,
    firstInputRef,
    onRemove,
    onMoveUp,
    onMoveDown,
}: {
    field: LanguageField;
    index: number;
    total: number;
    form: UseFormReturn<ExtrasForm>;
    firstInputRef?: React.MutableRefObject<HTMLInputElement | null>;
    onRemove: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
}) {
    const { register, formState: { errors } } = form;
    const prefix = `languages.${index}` as const;
    const langErrors = errors.languages?.[index];

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1 w-full flex items-start sm:items-center gap-4">
                <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold mt-1 sm:mt-0" aria-hidden="true">
                    {index + 1}
                </span>

                <input type="hidden" {...register(`${prefix}.clientId`)} />

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                    <div>
                        <label htmlFor={`${prefix}.name`} className="sr-only">Language Name</label>
                        {(() => {
                            const { ref: rhfRef, ...rhfProps } = register(`${prefix}.name`);
                            return (
                                <input
                                    id={`${prefix}.name`}
                                    type="text"
                                    placeholder="e.g. English"
                                    aria-required="true"
                                    aria-label="Language Name"
                                    aria-invalid={!!langErrors?.name}
                                    aria-describedby={langErrors?.name ? `${prefix}.name-error` : undefined}
                                    {...rhfProps}
                                    ref={(el) => {
                                        rhfRef(el);
                                        if (firstInputRef) firstInputRef.current = el;
                                    }}
                                    className={inputBase}
                                />
                            );
                        })()}
                        {langErrors?.name && <p id={`${prefix}.name-error`} className="mt-1 text-xs text-red-600">{langErrors.name.message}</p>}
                    </div>

                    <div>
                        <label htmlFor={`${prefix}.proficiency`} className="sr-only">Proficiency</label>
                        <select
                            id={`${prefix}.proficiency`}
                            aria-required="true"
                            aria-label="Proficiency"
                            {...register(`${prefix}.proficiency`)}
                            className={cn(inputBase, 'bg-white appearance-none pr-10')}
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                backgroundPosition: 'right 0.5rem center',
                                backgroundRepeat: 'no-repeat',
                                backgroundSize: '1.5em 1.5em',
                            }}
                        >
                            {proficiencyLevels.map((lvl) => (
                                <option key={lvl} value={lvl}>
                                    {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1 sm:ml-auto w-full sm:w-auto justify-end mt-2 sm:mt-0">
                <button type="button" onClick={onMoveUp} disabled={index === 0} aria-label="Move up" className={cn('p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors', index === 0 && 'opacity-30 cursor-not-allowed')}>
                    <ChevronUp className="h-4 w-4" />
                </button>
                <button type="button" onClick={onMoveDown} disabled={index === total - 1} aria-label="Move down" className={cn('p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors', index === total - 1 && 'opacity-30 cursor-not-allowed')}>
                    <ChevronDown className="h-4 w-4" />
                </button>
                <button type="button" onClick={onRemove} aria-label="Remove" className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

// ─── Certification Card ──────────────────────────────────────────────────────

type CertificationField = FieldArrayWithId<ExtrasForm, 'certifications', '_rhfId'>;

function CertificationCard({
    field,
    index,
    total,
    form,
    firstInputRef,
    onRemove,
    onMoveUp,
    onMoveDown,
}: {
    field: CertificationField;
    index: number;
    total: number;
    form: UseFormReturn<ExtrasForm>;
    firstInputRef?: React.MutableRefObject<HTMLInputElement | null>;
    onRemove: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
}) {
    const { register, formState: { errors } } = form;
    const prefix = `certifications.${index}` as const;
    const certErrors = errors.certifications?.[index];

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 relative">
            <div className="absolute top-4 right-4 flex items-center gap-1">
                <button type="button" onClick={onMoveUp} disabled={index === 0} aria-label="Move up" className={cn('p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors', index === 0 && 'opacity-30 cursor-not-allowed')}>
                    <ChevronUp className="h-4 w-4" />
                </button>
                <button type="button" onClick={onMoveDown} disabled={index === total - 1} aria-label="Move down" className={cn('p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors', index === total - 1 && 'opacity-30 cursor-not-allowed')}>
                    <ChevronDown className="h-4 w-4" />
                </button>
                <button type="button" onClick={onRemove} aria-label="Remove" className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>

            <div className="flex items-center gap-2 mb-5">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold" aria-hidden="true">
                    {index + 1}
                </span>
                <span className="text-sm font-semibold text-gray-700">Certification {index + 1}</span>
            </div>

            <input type="hidden" {...register(`${prefix}.clientId`)} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                    <label htmlFor={`${prefix}.name`} className={labelBase}>Name <span className="text-red-500">*</span></label>
                    {(() => {
                        const { ref: rhfRef, ...rhfProps } = register(`${prefix}.name`);
                        return (
                            <input
                                id={`${prefix}.name`}
                                type="text"
                                placeholder="e.g. AWS Certified Developer"
                                aria-invalid={!!certErrors?.name}
                                {...rhfProps}
                                ref={(el) => {
                                    rhfRef(el);
                                    if (firstInputRef) firstInputRef.current = el;
                                }}
                                className={inputBase}
                            />
                        );
                    })()}
                    {certErrors?.name && <p className="mt-1 text-xs text-red-600">{certErrors.name.message}</p>}
                </div>
                <div>
                    <label htmlFor={`${prefix}.issuer`} className={labelBase}>Issuer <span className="text-red-500">*</span></label>
                    <input id={`${prefix}.issuer`} type="text" placeholder="e.g. Amazon Web Services" aria-invalid={!!certErrors?.issuer} {...register(`${prefix}.issuer`)} className={inputBase} />
                    {certErrors?.issuer && <p className="mt-1 text-xs text-red-600">{certErrors.issuer.message}</p>}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                    <label htmlFor={`${prefix}.issueDate`} className={labelBase}>Issue Date</label>
                    <input id={`${prefix}.issueDate`} type="text" placeholder="MM/YYYY" {...register(`${prefix}.issueDate`)} className={inputBase} />
                    {certErrors?.issueDate && <p className="mt-1 text-xs text-red-600">{certErrors.issueDate.message}</p>}
                </div>
                <div>
                    <label htmlFor={`${prefix}.expiryDate`} className={labelBase}>Expiry Date</label>
                    <input id={`${prefix}.expiryDate`} type="text" placeholder="MM/YYYY" {...register(`${prefix}.expiryDate`)} className={inputBase} />
                    {certErrors?.expiryDate && <p className="mt-1 text-xs text-red-600">{certErrors.expiryDate.message}</p>}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor={`${prefix}.credentialId`} className={labelBase}>Credential ID</label>
                    <input id={`${prefix}.credentialId`} type="text" {...register(`${prefix}.credentialId`)} className={inputBase} />
                </div>
                <div>
                    <label htmlFor={`${prefix}.credentialUrl`} className={labelBase}>Credential URL</label>
                    <input id={`${prefix}.credentialUrl`} type="url" placeholder="https://" {...register(`${prefix}.credentialUrl`)} className={inputBase} />
                    {certErrors?.credentialUrl && <p className="mt-1 text-xs text-red-600">{certErrors.credentialUrl.message}</p>}
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ExtrasStep() {
    const draft = useResumeDraft();
    const { setLanguages, setCertifications, goToNextStep } = useResumeStore();
    const registerHeadingRef = useStepHeadingRef();
    const liveRegionRef = useRef<LiveRegionHandle>(null);

    const form = useForm<ExtrasForm>({
        resolver: zodResolver(extrasSchema) as unknown as import('react-hook-form').Resolver<ExtrasForm>,
        defaultValues: {
            languages: draft.languages,
            certifications: draft.certifications,
        },
        mode: 'onSubmit',
    });

    const langFields = useFieldArray({ control: form.control, name: 'languages', keyName: '_rhfId' });
    const certFields = useFieldArray({ control: form.control, name: 'certifications', keyName: '_rhfId' });

    const newLangFocusRef = useRef<HTMLInputElement | null>(null);
    const newCertFocusRef = useRef<HTMLInputElement | null>(null);

    const handleAddLang = useCallback(() => { langFields.append(createEmptyLanguage()); }, [langFields]);
    const handleAddCert = useCallback(() => { certFields.append(createEmptyCertification()); }, [certFields]);

    const onSubmit = (data: ExtrasForm) => {
        setLanguages(data.languages as LanguageDraft[]);
        setCertifications(data.certifications as CertificationDraft[]);
        goToNextStep();
    };

    return (
        <section aria-labelledby="step-heading">
            <LiveRegion ref={liveRegionRef} politeness="polite" />
            <h2 id="step-heading" ref={registerHeadingRef} tabIndex={-1} className="text-2xl font-bold text-gray-900 mb-6 focus:outline-none">
                Languages & Certifications
            </h2>

            <form id="resume-step-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
                {/* Languages Section */}
                <div className="mb-10">
                    <div className="flex items-center gap-2 mb-4">
                        <Languages className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-800">Languages</h3>
                    </div>
                    <div className="space-y-4">
                        {langFields.fields.length === 0 && (
                            <div className="text-center py-8 rounded-2xl border-2 border-dashed border-gray-200">
                                <p className="text-gray-400 text-sm">No languages added.</p>
                            </div>
                        )}
                        {langFields.fields.map((field, index) => (
                            <LanguageCard
                                key={field._rhfId}
                                field={field}
                                index={index}
                                total={langFields.fields.length}
                                form={form}
                                firstInputRef={index === langFields.fields.length - 1 ? newLangFocusRef : undefined}
                                onRemove={() => langFields.remove(index)}
                                onMoveUp={() => langFields.swap(index, index - 1)}
                                onMoveDown={() => langFields.swap(index, index + 1)}
                            />
                        ))}
                    </div>
                    <button type="button" onClick={handleAddLang} className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border-2 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 transition-all font-semibold text-sm">
                        <Plus className="h-4 w-4" /> Add Language
                    </button>
                </div>

                <hr className="border-gray-200 mb-10" />

                {/* Certifications Section */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <Award className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-800">Certifications</h3>
                    </div>
                    <div className="space-y-6">
                        {certFields.fields.length === 0 && (
                            <div className="text-center py-8 rounded-2xl border-2 border-dashed border-gray-200">
                                <p className="text-gray-400 text-sm">No certifications added.</p>
                            </div>
                        )}
                        {certFields.fields.map((field, index) => (
                            <CertificationCard
                                key={field._rhfId}
                                field={field}
                                index={index}
                                total={certFields.fields.length}
                                form={form}
                                firstInputRef={index === certFields.fields.length - 1 ? newCertFocusRef : undefined}
                                onRemove={() => certFields.remove(index)}
                                onMoveUp={() => certFields.swap(index, index - 1)}
                                onMoveDown={() => certFields.swap(index, index + 1)}
                            />
                        ))}
                    </div>
                    <button type="button" onClick={handleAddCert} className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border-2 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 transition-all font-semibold text-sm">
                        <Plus className="h-4 w-4" /> Add Certification
                    </button>
                </div>
            </form>
        </section>
    );
}
