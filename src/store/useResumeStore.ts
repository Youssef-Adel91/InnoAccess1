/**
 * useResumeStore — Zustand cross-step state store for the Resume Wizard
 *
 * ─── Architecture ─────────────────────────────────────────────────────────────
 *
 * This store is the "source of truth" for the resume draft as the user moves
 * through the 7-step wizard. React Hook Form is used ONLY within each step for
 * validation — on successful step submission, the validated data is merged here.
 *
 * The `persist` middleware automatically syncs this store to localStorage under
 * the key 'innoaccess-resume-draft'. This means:
 *   - Users can close the tab mid-wizard and resume exactly where they left off.
 *   - The store is hydrated instantly on mount from localStorage.
 *   - A PATCH to the DB is debounced separately via the useAutoSave hook.
 *
 * ─── Flow ─────────────────────────────────────────────────────────────────────
 *
 *   1. User opens /resume/new → store.initNewDraft() called
 *   2. Step 1 form submits → store.setPersonalInfo(validated)
 *   3. Step 2 form submits → store.setSummary(text)
 *   4. Step 3 form submits → store.setExperiences(array)
 *   ...etc.
 *   7. Preview step → store.draft used to render PDF preview
 *
 *   On any change → useAutoSave hook debounces PATCH /api/resumes/:id
 *   On save complete → store.markSaved(Date) updates lastSavedAt
 *
 * ─── Wizard Steps ────────────────────────────────────────────────────────────
 *   0 = Personal Info
 *   1 = Summary
 *   2 = Work Experience
 *   3 = Education
 *   4 = Skills
 *   5 = Languages & Certifications
 *   6 = Preview & Export
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ─── Step enum ────────────────────────────────────────────────────────────────

export const WIZARD_STEPS = [
    'personal',
    'summary',
    'experience',
    'education',
    'skills',
    'extras',
    'preview',
] as const;

export type WizardStep = (typeof WIZARD_STEPS)[number];
export const TOTAL_STEPS = WIZARD_STEPS.length; // 7

// ─── Draft Data Types ─────────────────────────────────────────────────────────
// These types mirror the Mongoose interfaces in Resume.ts but are plain objects
// (no ObjectId, no Document) — safe to serialize to localStorage.

export interface PersonalInfoDraft {
    fullName:   string;
    email:      string;
    phone:      string;
    location:   string;
    website:    string;
    linkedin:   string;
    github:     string;
    portfolio:  string;
}

export interface WorkExperienceDraft {
    /**
     * Stable client-side ID — generated with crypto.randomUUID() when the entry
     * is added. Used as React `key` and in a11y announcements
     * ("Software Engineer at Google removed").
     */
    clientId:    string;
    jobTitle:    string;
    company:     string;
    location:    string;
    startDate:   string; // "MM/YYYY"
    endDate:     string; // "MM/YYYY" | "" = Present
    isCurrent:   boolean;
    description: string;
}

export interface EducationDraft {
    clientId:     string;
    institution:  string;
    degree:       string;
    fieldOfStudy: string;
    startDate:    string;
    endDate:      string;
    grade:        string;
    description:  string;
}

export interface SkillDraft {
    clientId: string;
    name:     string;
    level:    'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface LanguageDraft {
    clientId:    string;
    name:        string;
    proficiency: 'basic' | 'conversational' | 'professional' | 'native';
}

export interface CertificationDraft {
    clientId:      string;
    name:          string;
    issuer:        string;
    issueDate:     string;
    expiryDate:    string;
    credentialId:  string;
    credentialUrl: string;
}

export interface ResumeDraft {
    title:          string;
    direction:      'ltr' | 'rtl';
    personalInfo:   PersonalInfoDraft;
    summary:        string;
    experiences:    WorkExperienceDraft[];
    educations:     EducationDraft[];
    skills:         SkillDraft[];
    languages:      LanguageDraft[];
    certifications: CertificationDraft[];
    templateId:     'classic';
}

// ─── Store State ──────────────────────────────────────────────────────────────

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface ResumeState {
    // ── Session metadata ──────────────────────────────────────────────────────
    /** The MongoDB _id of the resume being edited. Null until first server save. */
    resumeId:    string | null;

    /** Zero-indexed step number (0 = Personal Info ... 6 = Preview) */
    currentStep: number;

    /** True if the draft has unsaved changes relative to the server. */
    isDirty:     boolean;

    /** Timestamp of the last successful PATCH to the DB. */
    lastSavedAt: string | null; // ISO string (Date serializes to string in localStorage)

    /** Current auto-save status — drives the "Saved ✓" / "Saving…" indicator. */
    saveStatus:  SaveStatus;

    // ── The actual resume content ─────────────────────────────────────────────
    draft: ResumeDraft;
}

// ─── Default Values ───────────────────────────────────────────────────────────

const EMPTY_PERSONAL_INFO: PersonalInfoDraft = {
    fullName:  '',
    email:     '',
    phone:     '',
    location:  '',
    website:   '',
    linkedin:  '',
    github:    '',
    portfolio: '',
};

const EMPTY_DRAFT: ResumeDraft = {
    title:          'My Resume',
    direction:      'ltr',
    personalInfo:   EMPTY_PERSONAL_INFO,
    summary:        '',
    experiences:    [],
    educations:     [],
    skills:         [],
    languages:      [],
    certifications: [],
    templateId:     'classic',
};

// ─── Store Actions ────────────────────────────────────────────────────────────

interface ResumeActions {
    // ── Session control ───────────────────────────────────────────────────────

    /**
     * Initialise a brand-new blank draft.
     * Called when the user clicks "Create New Resume".
     * Optionally pre-fills personalInfo from the user's profile.
     */
    initNewDraft: (prefill?: Partial<PersonalInfoDraft>) => void;

    /**
     * Load an existing resume from the server into the store for editing.
     * Called when the user opens an existing resume.
     */
    loadDraft: (resumeId: string, draft: ResumeDraft) => void;

    /** Clear the store. Called on wizard exit or resume deletion. */
    resetDraft: () => void;

    // ── Step navigation ───────────────────────────────────────────────────────
    setCurrentStep: (step: number) => void;
    goToNextStep:   () => void;
    goToPrevStep:   () => void;

    // ── Auto-save control ─────────────────────────────────────────────────────
    setResumeId:  (id: string) => void;
    markDirty:    () => void;
    markSaved:    (at: Date)  => void;
    setSaveStatus:(status: SaveStatus) => void;

    // ── Meta fields ───────────────────────────────────────────────────────────
    setTitle:     (title: string) => void;
    setDirection: (dir: 'ltr' | 'rtl') => void;

    // ── Step data setters (called on per-step form submission) ────────────────
    setPersonalInfo:   (data: PersonalInfoDraft) => void;
    setSummary:        (text: string) => void;
    setExperiences:    (items: WorkExperienceDraft[]) => void;
    setEducations:     (items: EducationDraft[]) => void;
    setSkills:         (items: SkillDraft[]) => void;
    setLanguages:      (items: LanguageDraft[]) => void;
    setCertifications: (items: CertificationDraft[]) => void;

    // ── Granular array mutators ───────────────────────────────────────────────
    // These are used by the array-field components for immediate optimistic
    // updates (add/remove/reorder) WITHOUT requiring a full form submit.

    addExperience:    (item: WorkExperienceDraft) => void;
    removeExperience: (clientId: string) => void;
    moveExperience:   (clientId: string, direction: 'up' | 'down') => void;

    addEducation:    (item: EducationDraft) => void;
    removeEducation: (clientId: string) => void;
    moveEducation:   (clientId: string, direction: 'up' | 'down') => void;

    addSkill:    (item: SkillDraft) => void;
    removeSkill: (clientId: string) => void;
    moveSkill:   (clientId: string, direction: 'up' | 'down') => void;

    addLanguage:    (item: LanguageDraft) => void;
    removeLanguage: (clientId: string) => void;

    addCertification:    (item: CertificationDraft) => void;
    removeCertification: (clientId: string) => void;
    moveCertification:   (clientId: string, direction: 'up' | 'down') => void;
}

// ─── Generic array helpers ────────────────────────────────────────────────────

/** Moves an item one position in an array without mutating the original. */
function moveItem<T extends { clientId: string }>(
    arr: T[],
    clientId: string,
    direction: 'up' | 'down'
): T[] {
    const idx = arr.findIndex((item) => item.clientId === clientId);
    if (idx === -1) return arr;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= arr.length) return arr;

    const next = [...arr];
    [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
    return next;
}

/** Removes an item by clientId without mutating the original. */
function removeItem<T extends { clientId: string }>(arr: T[], clientId: string): T[] {
    return arr.filter((item) => item.clientId !== clientId);
}

// ─── Store Definition ─────────────────────────────────────────────────────────

export const useResumeStore = create<ResumeState & ResumeActions>()(
    persist(
        (set, get) => ({
            // ── Initial state ─────────────────────────────────────────────────
            resumeId:    null,
            currentStep: 0,
            isDirty:     false,
            lastSavedAt: null,
            saveStatus:  'idle',
            draft:       { ...EMPTY_DRAFT },

            // ── Session control ───────────────────────────────────────────────

            initNewDraft: (prefill?) =>
                set({
                    resumeId:    null,
                    currentStep: 0,
                    isDirty:     false,
                    lastSavedAt: null,
                    saveStatus:  'idle',
                    draft: {
                        ...EMPTY_DRAFT,
                        personalInfo: {
                            ...EMPTY_PERSONAL_INFO,
                            ...prefill,
                        },
                    },
                }),

            loadDraft: (resumeId, draft) =>
                set({
                    resumeId,
                    draft,
                    currentStep: 0,
                    isDirty:     false,
                    lastSavedAt: new Date().toISOString(),
                    saveStatus:  'saved',
                }),

            resetDraft: () =>
                set({
                    resumeId:    null,
                    currentStep: 0,
                    isDirty:     false,
                    lastSavedAt: null,
                    saveStatus:  'idle',
                    draft:       { ...EMPTY_DRAFT },
                }),

            // ── Step navigation ───────────────────────────────────────────────

            setCurrentStep: (step) => set({ currentStep: step }),

            goToNextStep: () =>
                set((state) => ({
                    currentStep: Math.min(state.currentStep + 1, TOTAL_STEPS - 1),
                })),

            goToPrevStep: () =>
                set((state) => ({
                    currentStep: Math.max(state.currentStep - 1, 0),
                })),

            // ── Auto-save control ─────────────────────────────────────────────

            setResumeId:   (id)     => set({ resumeId: id }),
            markDirty:     ()       => set({ isDirty: true, saveStatus: 'idle' }),
            markSaved:     (at)     => set({ isDirty: false, lastSavedAt: at.toISOString(), saveStatus: 'saved' }),
            setSaveStatus: (status) => set({ saveStatus: status }),

            // ── Meta fields ───────────────────────────────────────────────────

            setTitle:     (title) => set((s) => ({ draft: { ...s.draft, title },     isDirty: true })),
            setDirection: (dir)   => set((s) => ({ draft: { ...s.draft, direction: dir }, isDirty: true })),

            // ── Step data setters ─────────────────────────────────────────────

            setPersonalInfo: (personalInfo) =>
                set((s) => ({ draft: { ...s.draft, personalInfo }, isDirty: true })),

            setSummary: (summary) =>
                set((s) => ({ draft: { ...s.draft, summary }, isDirty: true })),

            setExperiences: (experiences) =>
                set((s) => ({ draft: { ...s.draft, experiences }, isDirty: true })),

            setEducations: (educations) =>
                set((s) => ({ draft: { ...s.draft, educations }, isDirty: true })),

            setSkills: (skills) =>
                set((s) => ({ draft: { ...s.draft, skills }, isDirty: true })),

            setLanguages: (languages) =>
                set((s) => ({ draft: { ...s.draft, languages }, isDirty: true })),

            setCertifications: (certifications) =>
                set((s) => ({ draft: { ...s.draft, certifications }, isDirty: true })),

            // ── Experience array mutators ─────────────────────────────────────

            addExperience: (item) =>
                set((s) => ({
                    draft:   { ...s.draft, experiences: [...s.draft.experiences, item] },
                    isDirty: true,
                })),

            removeExperience: (clientId) =>
                set((s) => ({
                    draft:   { ...s.draft, experiences: removeItem(s.draft.experiences, clientId) },
                    isDirty: true,
                })),

            moveExperience: (clientId, direction) =>
                set((s) => ({
                    draft:   { ...s.draft, experiences: moveItem(s.draft.experiences, clientId, direction) },
                    isDirty: true,
                })),

            // ── Education array mutators ──────────────────────────────────────

            addEducation: (item) =>
                set((s) => ({
                    draft:   { ...s.draft, educations: [...s.draft.educations, item] },
                    isDirty: true,
                })),

            removeEducation: (clientId) =>
                set((s) => ({
                    draft:   { ...s.draft, educations: removeItem(s.draft.educations, clientId) },
                    isDirty: true,
                })),

            moveEducation: (clientId, direction) =>
                set((s) => ({
                    draft:   { ...s.draft, educations: moveItem(s.draft.educations, clientId, direction) },
                    isDirty: true,
                })),

            // ── Skill array mutators ──────────────────────────────────────────

            addSkill: (item) =>
                set((s) => ({
                    draft:   { ...s.draft, skills: [...s.draft.skills, item] },
                    isDirty: true,
                })),

            removeSkill: (clientId) =>
                set((s) => ({
                    draft:   { ...s.draft, skills: removeItem(s.draft.skills, clientId) },
                    isDirty: true,
                })),

            moveSkill: (clientId, direction) =>
                set((s) => ({
                    draft:   { ...s.draft, skills: moveItem(s.draft.skills, clientId, direction) },
                    isDirty: true,
                })),

            // ── Language array mutators ───────────────────────────────────────

            addLanguage: (item) =>
                set((s) => ({
                    draft:   { ...s.draft, languages: [...s.draft.languages, item] },
                    isDirty: true,
                })),

            removeLanguage: (clientId) =>
                set((s) => ({
                    draft:   { ...s.draft, languages: removeItem(s.draft.languages, clientId) },
                    isDirty: true,
                })),

            // ── Certification array mutators ──────────────────────────────────

            addCertification: (item) =>
                set((s) => ({
                    draft:   { ...s.draft, certifications: [...s.draft.certifications, item] },
                    isDirty: true,
                })),

            removeCertification: (clientId) =>
                set((s) => ({
                    draft:   { ...s.draft, certifications: removeItem(s.draft.certifications, clientId) },
                    isDirty: true,
                })),

            moveCertification: (clientId, direction) =>
                set((s) => ({
                    draft:   { ...s.draft, certifications: moveItem(s.draft.certifications, clientId, direction) },
                    isDirty: true,
                })),
        }),

        // ── Persist configuration ─────────────────────────────────────────────
        {
            name:    'innoaccess-resume-draft',
            storage: createJSONStorage(() => localStorage),

            /**
             * Partial persistence: do NOT persist UI-only state.
             * `saveStatus` should always start as 'idle' on page load.
             * `currentStep` IS persisted — user returns to where they left off.
             */
            partialize: (state) => ({
                resumeId:    state.resumeId,
                currentStep: state.currentStep,
                isDirty:     state.isDirty,
                lastSavedAt: state.lastSavedAt,
                draft:       state.draft,
                // saveStatus intentionally NOT persisted — resets to 'idle'
            }),

            /**
             * Schema version. Increment this when the draft shape changes
             * in a breaking way (e.g., adding a required field). Zustand will
             * discard the old localStorage value and start fresh, preventing
             * crashes from stale persisted state.
             */
            version: 1,
        }
    )
);

// ─── Selector hooks ───────────────────────────────────────────────────────────
// Fine-grained selectors prevent unnecessary re-renders.
// Components import these instead of useResumeStore() directly.

export const useResumeDraft        = () => useResumeStore((s) => s.draft);
export const useResumeCurrentStep  = () => useResumeStore((s) => s.currentStep);
export const useResumeSaveStatus   = () => useResumeStore((s) => s.saveStatus);
export const useResumeIsDirty      = () => useResumeStore((s) => s.isDirty);
export const useResumeLastSavedAt  = () => useResumeStore((s) => s.lastSavedAt);
export const useResumeId           = () => useResumeStore((s) => s.resumeId);
