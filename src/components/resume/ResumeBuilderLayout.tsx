'use client';

import {
    useRef,
    useEffect,
    useCallback,
    type ReactNode,
} from 'react';
import { CheckCircle, User, FileText, Briefcase, GraduationCap, Star, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AutoSaveIndicator } from './AutoSaveIndicator';
import { useAutoSave } from '@/hooks/useAutoSave';
import {
    useResumeStore,
    useResumeCurrentStep,
    WIZARD_STEPS,
    TOTAL_STEPS,
} from '@/store/useResumeStore';

// ─── Step metadata ─────────────────────────────────────────────────────────────

const STEP_META = [
    { label: 'Personal Info', shortLabel: 'Personal', Icon: User,          id: 'step-personal'    },
    { label: 'Summary',       shortLabel: 'Summary',  Icon: FileText,       id: 'step-summary'     },
    { label: 'Experience',    shortLabel: 'Exp.',     Icon: Briefcase,      id: 'step-experience'  },
    { label: 'Education',     shortLabel: 'Edu.',     Icon: GraduationCap,  id: 'step-education'   },
    { label: 'Skills',        shortLabel: 'Skills',   Icon: Star,           id: 'step-skills'      },
    { label: 'Languages',     shortLabel: 'Extras',   Icon: Globe,          id: 'step-extras'      },
    { label: 'Preview',       shortLabel: 'Preview',  Icon: FileText,       id: 'step-preview'     },
] as const;

// ─── Props ────────────────────────────────────────────────────────────────────

interface ResumeBuilderLayoutProps {
    /** The currently active step component (PersonalInfoStep, ExperienceStep, etc.) */
    children: ReactNode;
    /** Resume title shown in the header */
    title: string;
}

/**
 * ResumeBuilderLayout
 *
 * The outer shell of the Resume Wizard. Responsible for:
 *
 *   1. Rendering the progress stepper (role="tablist") with:
 *        - aria-current="step" on the active tab
 *        - aria-disabled="true" on future steps (not yet reached)
 *        - Completed steps marked with a ✓ icon and aria-label="Step N: Completed"
 *
 *   2. Rendering the step content in a role="tabpanel" with a matching
 *      aria-labelledby pointing to the active tab button.
 *
 *   3. FOCUS MANAGEMENT: When the step changes, programmatically moves
 *      focus to the <h2> heading of the new step panel.
 *      The heading has tabIndex={-1} so it receives focus without appearing
 *      in the natural tab order.
 *
 *   4. Mounting useAutoSave() once at the wizard root so it watches the
 *      Zustand draft and fires debounced PATCHes.
 *
 *   5. Rendering the AutoSaveIndicator in the header (aria-live="polite").
 */
export function ResumeBuilderLayout({ children, title }: ResumeBuilderLayoutProps) {
    // Mount the auto-save hook here — single instance for the entire wizard
    useAutoSave();

    const currentStep  = useResumeCurrentStep();
    const { setCurrentStep, goToNextStep, goToPrevStep } = useResumeStore();

    // ── Focus management ───────────────────────────────────────────────────────
    // Array of refs — one per step heading. When the step changes, focus is
    // programmatically moved to the heading of the incoming step.
    const headingRefs = useRef<Array<HTMLHeadingElement | null>>(
        Array(TOTAL_STEPS).fill(null)
    );

    const prevStepRef = useRef(currentStep);

    useEffect(() => {
        // Only shift focus if the step actually changed (not on initial mount)
        if (prevStepRef.current !== currentStep) {
            const heading = headingRefs.current[currentStep];
            if (heading) {
                // Small delay ensures the panel content is rendered before focus
                requestAnimationFrame(() => heading.focus());
            }
            prevStepRef.current = currentStep;
        }
    }, [currentStep]);

    // ── Stepper click handler ──────────────────────────────────────────────────
    // Users can only navigate BACK or to completed steps — not jump ahead.
    const handleStepClick = useCallback(
        (idx: number) => {
            if (idx <= currentStep) setCurrentStep(idx);
        },
        [currentStep, setCurrentStep]
    );

    const isFirst = currentStep === 0;
    const isLast  = currentStep === TOTAL_STEPS - 1;
    const activeStepMeta = STEP_META[currentStep];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* ── Wizard header ─────────────────────────────────────────── */}
            <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-semibold text-gray-900 truncate max-w-[200px] sm:max-w-xs">
                            {title}
                        </span>
                        <span className="hidden sm:inline text-xs text-gray-400">
                            Step {currentStep + 1} of {TOTAL_STEPS}
                        </span>
                    </div>
                    <AutoSaveIndicator />
                </div>

                {/* ── Stepper ──────────────────────────────────────────── */}
                <nav
                    aria-label="Resume builder steps"
                    className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8"
                >
                    <ol
                        role="tablist"
                        aria-orientation="horizontal"
                        className="flex items-center overflow-x-auto pb-3 gap-1 sm:gap-0"
                    >
                        {STEP_META.map((step, idx) => {
                            const isCompleted = idx < currentStep;
                            const isCurrent   = idx === currentStep;
                            const isFuture    = idx > currentStep;

                            return (
                                <li
                                    key={step.id}
                                    role="presentation"
                                    className="flex items-center flex-shrink-0"
                                >
                                    <button
                                        id={step.id}
                                        role="tab"
                                        type="button"
                                        aria-selected={isCurrent}
                                        aria-current={isCurrent ? 'step' : undefined}
                                        aria-disabled={isFuture}
                                        aria-label={
                                            isCompleted
                                                ? `Step ${idx + 1}: ${step.label} — Completed`
                                                : `Step ${idx + 1}: ${step.label}${isCurrent ? ' — Current' : ''}`
                                        }
                                        tabIndex={isFuture ? -1 : 0}
                                        onClick={() => handleStepClick(idx)}
                                        disabled={isFuture}
                                        className={cn(
                                            'flex flex-col items-center gap-1 px-2 sm:px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150',
                                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1',
                                            isCurrent  && 'text-blue-600',
                                            isCompleted && 'text-green-600 cursor-pointer hover:bg-green-50',
                                            isFuture   && 'text-gray-300 cursor-not-allowed',
                                        )}
                                    >
                                        {/* Step icon / number */}
                                        <span
                                            className={cn(
                                                'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors duration-150',
                                                isCurrent   && 'border-blue-600 bg-blue-600 text-white',
                                                isCompleted && 'border-green-500 bg-green-500 text-white',
                                                isFuture    && 'border-gray-200 bg-white text-gray-300',
                                            )}
                                            aria-hidden="true"
                                        >
                                            {isCompleted ? (
                                                <CheckCircle className="h-4 w-4" />
                                            ) : (
                                                <step.Icon className="h-4 w-4" />
                                            )}
                                        </span>
                                        {/* Label — hide text on mobile, show on sm+ */}
                                        <span className="hidden sm:block">{step.shortLabel}</span>
                                    </button>

                                    {/* Connector line between steps */}
                                    {idx < TOTAL_STEPS - 1 && (
                                        <div
                                            aria-hidden="true"
                                            className={cn(
                                                'hidden sm:block h-0.5 w-8 mx-1 rounded-full transition-colors duration-300',
                                                idx < currentStep ? 'bg-green-400' : 'bg-gray-200'
                                            )}
                                        />
                                    )}
                                </li>
                            );
                        })}
                    </ol>
                </nav>
            </header>

            {/* ── Step panel ───────────────────────────────────────────────── */}
            <main
                id="main-content"
                role="tabpanel"
                aria-labelledby={activeStepMeta.id}
                tabIndex={-1}
                className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8"
            >
                {/*
                 * Step heading — tabIndex={-1} makes it programmatically
                 * focusable (via heading.focus()) without entering the tab order.
                 * This is the a11y focus management target when the step changes.
                 *
                 * The ref callback pattern populates headingRefs.current[idx]
                 * for the CURRENTLY rendered step only. We set it on the step
                 * panel heading, which is provided by the child component via
                 * the `useStepHeadingRef` mechanism below.
                 *
                 * Implementation note: We pass the ref-setter DOWN to the step
                 * child by cloning with a special prop. The step component must
                 * attach this ref to its <h2>.
                 */}
                <StepHeadingRefContext.Provider
                    value={(el) => { headingRefs.current[currentStep] = el; }}
                >
                    {children}
                </StepHeadingRefContext.Provider>

                {/* ── Prev / Next navigation ─────────────────────────────── */}
                <div className="mt-10 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={goToPrevStep}
                        disabled={isFirst}
                        className={cn(
                            'inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm border-2 transition-all duration-150',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2',
                            isFirst
                                ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                                : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                        )}
                        aria-label={isFirst ? 'No previous step' : `Go back to ${STEP_META[currentStep - 1]?.label}`}
                    >
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Back
                    </button>

                    {isLast ? (
                        <span className="text-sm text-gray-500 italic">
                            Use the Export button on the preview to generate your PDF
                        </span>
                    ) : (
                        /*
                         * "Next" is a SUBMIT TRIGGER — clicking it submits the
                         * current step's RHF form (via form.submit() or a hidden
                         * submit button with form="current-step-form"). Each step
                         * component declares its form with id="resume-step-form".
                         */
                        <button
                            type="submit"
                            form="resume-step-form"
                            className={cn(
                                'inline-flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-sm text-white',
                                'bg-blue-600 hover:bg-blue-700 hover:shadow-md hover:shadow-blue-500/20',
                                'transition-all duration-150 active:scale-[0.98]',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2',
                                'min-h-[44px]',
                            )}
                            aria-label={`Save and continue to ${STEP_META[currentStep + 1]?.label}`}
                        >
                            Continue
                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                        </button>
                    )}
                </div>
            </main>
        </div>
    );
}

// ─── Context: passes heading ref-setter to child steps ────────────────────────

import { createContext, useContext } from 'react';

type HeadingRefSetter = (el: HTMLHeadingElement | null) => void;

export const StepHeadingRefContext = createContext<HeadingRefSetter>(() => {});

/**
 * useStepHeadingRef
 *
 * Used by each step component to register its <h2> with the layout's
 * focus management system.
 *
 * Usage inside a step component:
 *
 *   const headingRef = useStepHeadingRef();
 *   <h2 ref={headingRef} tabIndex={-1}>Personal Information</h2>
 */
export function useStepHeadingRef(): HeadingRefSetter {
    return useContext(StepHeadingRefContext);
}
