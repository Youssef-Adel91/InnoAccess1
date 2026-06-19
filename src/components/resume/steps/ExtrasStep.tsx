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

const btnBase =
    'p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ' +
    'min-h-[44px] min-w-[44px] flex items-center justify-center';

const removeBtnBase =
    'p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ' +
    'min-h-[44px] min-w-[44px] flex items-center justify-center';

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
    const { register, watch, formState: { errors } } = form;
    const prefix = `languages.${index}` as const;
    const langErrors = errors.languages?.[index];
    const langName = watch(`${prefix}.name`);

    return (
        <div
            role="group"
            aria-label={`Language ${index + 1} of ${total}${langName ? `: ${langName}` : ''}`}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center"
        >
            <div className="flex-1 w-full flex items-start sm:items-center gap-4">
                <span
                    className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold mt-1 sm:mt-0"
                    aria-hidden="true"
                >
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
                        {langErrors?.name && (
                            <p id={`${prefix}.name-error`} role="alert" className="mt-1 text-xs text-red-600">
                                {langErrors.name.message}
                            </p>
                        )}
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

            <div
                className="flex items-center gap-1 sm:ml-auto w-full sm:w-auto justify-end mt-2 sm:mt-0"
                role="group"
                aria-label={`Controls for language ${index + 1}${langName ? `: ${langName}` : ''}`}
            >
                <button
                    type="button"
                    onClick={onMoveUp}
                    disabled={index === 0}
                    aria-label={`Move ${langName || `language ${index + 1}`} up to position ${index}`}
                    className={cn(btnBase, index === 0 && 'opacity-30 cursor-not-allowed')}
                >
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={onMoveDown}
                    disabled={index === total - 1}
                    aria-label={`Move ${langName || `language ${index + 1}`} down to position ${index + 2}`}
                    className={cn(btnBase, index === total - 1 && 'opacity-30 cursor-not-allowed')}
                >
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={onRemove}
                    aria-label={`Remove ${langName || `language ${index + 1}`}`}
                    className={removeBtnBase}
                >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}

// ─── Certification Card ──────────────────────────────────────────────────────

type CertificationField = FieldArrayWithId<ExtrasForm, 'certifications', '_rhfId'>;

function CertificationCard({
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
    const { register, watch, formState: { errors } } = form;
    const prefix = `certifications.${index}` as const;
    const certErrors = errors.certifications?.[index];
    const certName = watch(`${prefix}.name`);

    return (
        <div
            role="group"
            aria-label={`Certification ${index + 1} of ${total}${certName ? `: ${certName}` : ''}`}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 relative"
        >
            <div
                className="absolute top-4 right-4 flex items-center gap-1"
                role="group"
                aria-label={`Controls for certification ${index + 1}${certName ? `: ${certName}` : ''}`}
            >
                <button
                    type="button"
                    onClick={onMoveUp}
                    disabled={index === 0}
                    aria-label={`Move ${certName || `certification ${index + 1}`} up to position ${index}`}
                    className={cn(btnBase, index === 0 && 'opacity-30 cursor-not-allowed')}
                >
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={onMoveDown}
                    disabled={index === total - 1}
                    aria-label={`Move ${certName || `certification ${index + 1}`} down to position ${index + 2}`}
                    className={cn(btnBase, index === total - 1 && 'opacity-30 cursor-not-allowed')}
                >
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={onRemove}
                    aria-label={`Remove ${certName || `certification ${index + 1}`}`}
                    className={removeBtnBase}
                >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>

            <div className="flex items-center gap-2 mb-5">
                <span
                    className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold"
                    aria-hidden="true"
                >
                    {index + 1}
                </span>
                <span className="text-sm font-semibold text-gray-700">
                    Certification {index + 1}
                    {certName && <span className="font-normal text-gray-400 ml-1">— {certName}</span>}
                </span>
            </div>

            <input type="hidden" {...register(`${prefix}.clientId`)} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                    <label htmlFor={`${prefix}.name`} className={labelBase}>
                        Name <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    {(() => {
                        const { ref: rhfRef, ...rhfProps } = register(`${prefix}.name`);
                        return (
                            <input
                                id={`${prefix}.name`}
                                type="text"
                                placeholder="e.g. AWS Certified Developer"
                                aria-required="true"
                                aria-invalid={!!certErrors?.name}
                                aria-describedby={certErrors?.name ? `${prefix}.name-error` : undefined}
                                {...rhfProps}
                                ref={(el) => {
                                    rhfRef(el);
                                    if (firstInputRef) firstInputRef.current = el;
                                }}
                                className={inputBase}
                            />
                        );
                    })()}
                    {certErrors?.name && (
                        <p id={`${prefix}.name-error`} role="alert" className="mt-1 text-xs text-red-600">
                            {certErrors.name.message}
                        </p>
                    )}
                </div>
                <div>
                    <label htmlFor={`${prefix}.issuer`} className={labelBase}>
                        Issuer <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                        id={`${prefix}.issuer`}
                        type="text"
                        placeholder="e.g. Amazon Web Services"
                        aria-required="true"
                        aria-invalid={!!certErrors?.issuer}
                        aria-describedby={certErrors?.issuer ? `${prefix}.issuer-error` : undefined}
                        {...register(`${prefix}.issuer`)}
                        className={inputBase}
                    />
                    {certErrors?.issuer && (
                        <p id={`${prefix}.issuer-error`} role="alert" className="mt-1 text-xs text-red-600">
                            {certErrors.issuer.message}
                        </p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                    <label htmlFor={`${prefix}.issueDate`} className={labelBase}>Issue Date</label>
                    <input
                        id={`${prefix}.issueDate`}
                        type="text"
                        placeholder="MM/YYYY"
                        {...register(`${prefix}.issueDate`)}
                        className={inputBase}
                    />
                    {certErrors?.issueDate && (
                        <p className="mt-1 text-xs text-red-600">{certErrors.issueDate.message}</p>
                    )}
                </div>
                <div>
                    <label htmlFor={`${prefix}.expiryDate`} className={labelBase}>Expiry Date</label>
                    <input
                        id={`${prefix}.expiryDate`}
                        type="text"
                        placeholder="MM/YYYY"
                        {...register(`${prefix}.expiryDate`)}
                        className={inputBase}
                    />
                    {certErrors?.expiryDate && (
                        <p className="mt-1 text-xs text-red-600">{certErrors.expiryDate.message}</p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor={`${prefix}.credentialId`} className={labelBase}>Credential ID</label>
                    <input
                        id={`${prefix}.credentialId`}
                        type="text"
                        {...register(`${prefix}.credentialId`)}
                        className={inputBase}
                    />
                </div>
                <div>
                    <label htmlFor={`${prefix}.credentialUrl`} className={labelBase}>Credential URL</label>
                    <input
                        id={`${prefix}.credentialUrl`}
                        type="url"
                        placeholder="https://"
                        {...register(`${prefix}.credentialUrl`)}
                        className={inputBase}
                    />
                    {certErrors?.credentialUrl && (
                        <p className="mt-1 text-xs text-red-600">{certErrors.credentialUrl.message}</p>
                    )}
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

    // ── Two separate live regions — one per list ───────────────────────────────
    const langLiveRef = useRef<LiveRegionHandle>(null);
    const certLiveRef = useRef<LiveRegionHandle>(null);

    // ── Refs for focus management ─────────────────────────────────────────────
    const addLangBtnRef = useRef<HTMLButtonElement>(null);
    const addCertBtnRef = useRef<HTMLButtonElement>(null);
    const newLangFocusRef = useRef<HTMLInputElement | null>(null);
    const newCertFocusRef = useRef<HTMLInputElement | null>(null);

    // ── Refs to track add/remove/move intent ──────────────────────────────────
    const removeLangRef = useRef<{ name: string } | null>(null);
    const removeCertRef = useRef<{ name: string } | null>(null);
    const moveLangRef   = useRef<{ toIndex: number } | null>(null);
    const moveCertRef   = useRef<{ toIndex: number } | null>(null);

    const form = useForm<ExtrasForm>({
        resolver: zodResolver(extrasSchema) as unknown as import('react-hook-form').Resolver<ExtrasForm>,
        defaultValues: {
            languages:      draft.languages,
            certifications: draft.certifications,
        },
        mode: 'onSubmit',
    });

    const langFields = useFieldArray({ control: form.control, name: 'languages',      keyName: '_rhfId' });
    const certFields = useFieldArray({ control: form.control, name: 'certifications', keyName: '_rhfId' });

    // ── Track previous lengths & order for change detection ───────────────────
    const prevLangLenRef  = useRef(langFields.fields.length);
    const prevCertLenRef  = useRef(certFields.fields.length);
    const prevLangOrderRef = useRef<string[]>(langFields.fields.map((f) => f.clientId));
    const prevCertOrderRef = useRef<string[]>(certFields.fields.map((f) => f.clientId));

    // ── Language ADD effect ───────────────────────────────────────────────────
    useEffect(() => {
        if (langFields.fields.length > prevLangLenRef.current) {
            requestAnimationFrame(() => { newLangFocusRef.current?.focus(); });
            langLiveRef.current?.announce(
                `New language added. Entry ${langFields.fields.length} of ${langFields.fields.length}.`
            );
        }
        prevLangLenRef.current = langFields.fields.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [langFields.fields.length]);

    // ── Language REMOVE effect ────────────────────────────────────────────────
    useEffect(() => {
        if (removeLangRef.current !== null && langFields.fields.length < prevLangLenRef.current) {
            const { name }  = removeLangRef.current;
            const remaining = langFields.fields.length;
            const label     = name ? `Language "${name}"` : 'Language';
            langLiveRef.current?.announce(
                remaining > 0
                    ? `${label} removed. ${remaining} ${remaining === 1 ? 'entry' : 'entries'} remaining.`
                    : `${label} removed. No entries remaining.`
            );
            requestAnimationFrame(() => { addLangBtnRef.current?.focus(); });
            removeLangRef.current    = null;
            prevLangLenRef.current   = langFields.fields.length;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [langFields.fields]);

    // ── Language MOVE effect ──────────────────────────────────────────────────
    useEffect(() => {
        const currentOrder = langFields.fields.map((f) => f.clientId);
        if (
            moveLangRef.current !== null &&
            JSON.stringify(currentOrder) !== JSON.stringify(prevLangOrderRef.current)
        ) {
            const { toIndex } = moveLangRef.current;
            const name = form.getValues(`languages.${toIndex}.name`);
            langLiveRef.current?.announce(
                `${name || `Language ${toIndex + 1}`} moved to position ${toIndex + 1} of ${langFields.fields.length}.`
            );
            moveLangRef.current = null;
        }
        prevLangOrderRef.current = currentOrder;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [langFields.fields]);

    // ── Certification ADD effect ──────────────────────────────────────────────
    useEffect(() => {
        if (certFields.fields.length > prevCertLenRef.current) {
            requestAnimationFrame(() => { newCertFocusRef.current?.focus(); });
            certLiveRef.current?.announce(
                `New certification added. Entry ${certFields.fields.length} of ${certFields.fields.length}.`
            );
        }
        prevCertLenRef.current = certFields.fields.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [certFields.fields.length]);

    // ── Certification REMOVE effect ───────────────────────────────────────────
    useEffect(() => {
        if (removeCertRef.current !== null && certFields.fields.length < prevCertLenRef.current) {
            const { name }  = removeCertRef.current;
            const remaining = certFields.fields.length;
            const label     = name ? `Certification "${name}"` : 'Certification';
            certLiveRef.current?.announce(
                remaining > 0
                    ? `${label} removed. ${remaining} ${remaining === 1 ? 'entry' : 'entries'} remaining.`
                    : `${label} removed. No entries remaining.`
            );
            requestAnimationFrame(() => { addCertBtnRef.current?.focus(); });
            removeCertRef.current  = null;
            prevCertLenRef.current = certFields.fields.length;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [certFields.fields]);

    // ── Certification MOVE effect ─────────────────────────────────────────────
    useEffect(() => {
        const currentOrder = certFields.fields.map((f) => f.clientId);
        if (
            moveCertRef.current !== null &&
            JSON.stringify(currentOrder) !== JSON.stringify(prevCertOrderRef.current)
        ) {
            const { toIndex } = moveCertRef.current;
            const name = form.getValues(`certifications.${toIndex}.name`);
            certLiveRef.current?.announce(
                `${name || `Certification ${toIndex + 1}`} moved to position ${toIndex + 1} of ${certFields.fields.length}.`
            );
            moveCertRef.current = null;
        }
        prevCertOrderRef.current = currentOrder;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [certFields.fields]);

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleAddLang = useCallback(() => {
        langFields.append(createEmptyLanguage());
    }, [langFields]);

    const handleRemoveLang = useCallback((index: number) => {
        const name = form.getValues(`languages.${index}.name`);
        removeLangRef.current = { name };
        langFields.remove(index);
    }, [form, langFields]);

    const handleMoveLang = useCallback((index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= langFields.fields.length) return;
        moveLangRef.current = { toIndex: targetIndex };
        langFields.swap(index, targetIndex);
    }, [langFields]);

    const handleAddCert = useCallback(() => {
        certFields.append(createEmptyCertification());
    }, [certFields]);

    const handleRemoveCert = useCallback((index: number) => {
        const name = form.getValues(`certifications.${index}.name`);
        removeCertRef.current = { name };
        certFields.remove(index);
    }, [form, certFields]);

    const handleMoveCert = useCallback((index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= certFields.fields.length) return;
        moveCertRef.current = { toIndex: targetIndex };
        certFields.swap(index, targetIndex);
    }, [certFields]);

    const onSubmit = (data: ExtrasForm) => {
        setLanguages(data.languages as LanguageDraft[]);
        setCertifications(data.certifications as CertificationDraft[]);
        goToNextStep();
    };

    return (
        <section aria-labelledby="step-heading">
            {/* Separate live regions per list — avoids message collisions */}
            <LiveRegion ref={langLiveRef} politeness="polite" />
            <LiveRegion ref={certLiveRef} politeness="polite" />

            <h2
                id="step-heading"
                ref={registerHeadingRef}
                tabIndex={-1}
                className="text-2xl font-bold text-gray-900 mb-6 focus:outline-none"
            >
                Languages &amp; Certifications
            </h2>

            <form id="resume-step-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>

                {/* ── Languages Section ──────────────────────────────────── */}
                <div className="mb-10">
                    <div className="flex items-center gap-2 mb-4">
                        <Languages className="h-5 w-5 text-blue-600" aria-hidden="true" />
                        <h3 className="text-lg font-semibold text-gray-800">Languages</h3>
                    </div>

                    <div
                        className="space-y-4"
                        role="list"
                        aria-label={`Language entries (${langFields.fields.length} total)`}
                    >
                        {langFields.fields.length === 0 && (
                            <div className="text-center py-8 rounded-2xl border-2 border-dashed border-gray-200">
                                <Languages className="h-8 w-8 text-gray-300 mx-auto mb-2" aria-hidden="true" />
                                <p className="text-gray-400 text-sm">No languages added yet.</p>
                                <p className="text-gray-400 text-sm">Click &quot;Add Language&quot; below.</p>
                            </div>
                        )}

                        {langFields.fields.map((field, index) => (
                            <div key={field._rhfId} role="listitem">
                                <LanguageCard
                                    field={field}
                                    index={index}
                                    total={langFields.fields.length}
                                    form={form}
                                    firstInputRef={index === langFields.fields.length - 1 ? newLangFocusRef : undefined}
                                    onRemove={()                    => handleRemoveLang(index)}
                                    onMoveUp={()                    => handleMoveLang(index, 'up')}
                                    onMoveDown={()                  => handleMoveLang(index, 'down')}
                                />
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        ref={addLangBtnRef}
                        onClick={handleAddLang}
                        aria-label="Add a new language entry"
                        className={cn(
                            'mt-4 w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl',
                            'border-2 border-dashed border-blue-300 text-blue-600',
                            'hover:border-blue-500 hover:bg-blue-50 transition-all duration-150',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2',
                            'font-semibold text-sm min-h-[52px]',
                        )}
                    >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        Add Language
                    </button>
                </div>

                <hr className="border-gray-200 mb-10" />

                {/* ── Certifications Section ─────────────────────────────── */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <Award className="h-5 w-5 text-blue-600" aria-hidden="true" />
                        <h3 className="text-lg font-semibold text-gray-800">Certifications</h3>
                    </div>

                    <div
                        className="space-y-6"
                        role="list"
                        aria-label={`Certification entries (${certFields.fields.length} total)`}
                    >
                        {certFields.fields.length === 0 && (
                            <div className="text-center py-8 rounded-2xl border-2 border-dashed border-gray-200">
                                <Award className="h-8 w-8 text-gray-300 mx-auto mb-2" aria-hidden="true" />
                                <p className="text-gray-400 text-sm">No certifications added yet.</p>
                                <p className="text-gray-400 text-sm">Click &quot;Add Certification&quot; below.</p>
                            </div>
                        )}

                        {certFields.fields.map((field, index) => (
                            <div key={field._rhfId} role="listitem">
                                <CertificationCard
                                    field={field}
                                    index={index}
                                    total={certFields.fields.length}
                                    form={form}
                                    firstInputRef={index === certFields.fields.length - 1 ? newCertFocusRef : undefined}
                                    onRemove={()                    => handleRemoveCert(index)}
                                    onMoveUp={()                    => handleMoveCert(index, 'up')}
                                    onMoveDown={()                  => handleMoveCert(index, 'down')}
                                />
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        ref={addCertBtnRef}
                        onClick={handleAddCert}
                        aria-label="Add a new certification entry"
                        className={cn(
                            'mt-4 w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl',
                            'border-2 border-dashed border-blue-300 text-blue-600',
                            'hover:border-blue-500 hover:bg-blue-50 transition-all duration-150',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2',
                            'font-semibold text-sm min-h-[52px]',
                        )}
                    >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        Add Certification
                    </button>
                </div>
            </form>
        </section>
    );
}
