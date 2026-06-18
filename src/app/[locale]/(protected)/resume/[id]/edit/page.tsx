'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useResumeStore } from '@/store/useResumeStore';
import { ResumeBuilderLayout } from '@/components/resume/ResumeBuilderLayout';
import { PersonalInfoStep } from '@/components/resume/steps/PersonalInfoStep';
import { SummaryStep } from '@/components/resume/steps/SummaryStep';
import { ExperienceStep } from '@/components/resume/steps/ExperienceStep';
import { EducationStep } from '@/components/resume/steps/EducationStep';
import { SkillsStep } from '@/components/resume/steps/SkillsStep';
import { ExtrasStep } from '@/components/resume/steps/ExtrasStep';
import { PreviewStep } from '@/components/resume/steps/PreviewStep';
import type { ResumeDraft } from '@/store/useResumeStore';

// ─── Step renderer ────────────────────────────────────────────────────────────

/**
 * Renders the correct step component based on currentStep.
 * Each step component declares id="resume-step-form" on its <form> so the
 * layout's "Continue" button can submit it via the `form` HTML attribute.
 */
function StepRenderer({ step }: { step: number }) {
    switch (step) {
        case 0: return <PersonalInfoStep />;
        case 1: return <SummaryStep />;
        case 2: return <ExperienceStep />;
        case 3: return <EducationStep />;
        case 4: return <SkillsStep />;
        case 5: return <ExtrasStep />;
        case 6: return <PreviewStep />;
        default: return null;
    }
}

// ─── Main edit page ───────────────────────────────────────────────────────────

/**
 * ResumeEditPage — /[locale]/(protected)/resume/[id]/edit
 *
 * ── Data flow ─────────────────────────────────────────────────────────────────
 *
 *   1. On mount: fetch GET /api/resumes/:id
 *   2. Map the API response shape → ResumeDraft (converting ObjectId _ids
 *      to clientId strings for the Zustand store)
 *   3. Call store.loadDraft(resumeId, draft) to hydrate the wizard
 *   4. Render ResumeBuilderLayout + StepRenderer
 *
 * ── Why client component (not server component)? ─────────────────────────────
 *
 *   The Zustand store is a client-only store (uses localStorage). We cannot
 *   hydrate it from a Server Component because RSC runs without access to
 *   browser APIs. The fetch is therefore done client-side on mount.
 *
 *   For SEO this page is protected (auth-gated), so there is no meaningful
 *   metadata to index — client-side fetch is appropriate here.
 *
 *   If initial load performance becomes a concern, this can be converted to a
 *   Server Component that passes the initial data as a prop to a client
 *   "HydrationBoundary" child component (same pattern as React Query).
 *
 * ── Zustand persist de-duplication ───────────────────────────────────────────
 *
 *   If the user has a persisted draft in localStorage for this same resumeId,
 *   we prefer the SERVER data (more authoritative) and overwrite the local cache.
 *   This prevents the user from seeing stale local data if they edited the
 *   resume on another device.
 */
export default function ResumeEditPage() {
    const params      = useParams<{ id: string }>();
    const router      = useRouter();
    const { status }  = useSession();
    const resumeId    = params.id;

    const { loadDraft, resetDraft, draft, currentStep } = useResumeStore();

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError]         = useState<string | null>(null);

    // ── Fetch + hydrate ────────────────────────────────────────────────────────
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
            return;
        }
        if (status !== 'authenticated') return;

        async function fetchAndHydrate() {
            try {
                const res = await fetch(`/api/resumes/${resumeId}`, {
                    cache: 'no-store',
                });

                if (res.status === 404) {
                    setError('Resume not found. It may have been deleted.');
                    return;
                }

                if (!res.ok) {
                    throw new Error(`Failed to load resume: ${res.status}`);
                }

                const json = await res.json();
                const raw  = json.data.resume;

                // ── Map DB document → ResumeDraft ─────────────────────────
                // MongoDB sub-documents have `_id` (ObjectId). The Zustand store
                // uses `clientId` (string UUID). We convert here at the boundary.
                const resumeDraft: ResumeDraft = {
                    title:       raw.title      ?? 'My Resume',
                    direction:   raw.direction   ?? 'ltr',
                    personalInfo: {
                        fullName:  raw.personalInfo?.fullName  ?? '',
                        email:     raw.personalInfo?.email     ?? '',
                        phone:     raw.personalInfo?.phone     ?? '',
                        location:  raw.personalInfo?.location  ?? '',
                        website:   raw.personalInfo?.website   ?? '',
                        linkedin:  raw.personalInfo?.linkedin  ?? '',
                        github:    raw.personalInfo?.github    ?? '',
                        portfolio: raw.personalInfo?.portfolio ?? '',
                    },
                    summary: raw.summary ?? '',
                    experiences: (raw.experiences ?? []).map((exp: Record<string, string | boolean>) => ({
                        clientId:    String(exp._id),
                        jobTitle:    exp.jobTitle    ?? '',
                        company:     exp.company     ?? '',
                        location:    exp.location    ?? '',
                        startDate:   exp.startDate   ?? '',
                        endDate:     exp.endDate     ?? '',
                        isCurrent:   exp.isCurrent   ?? false,
                        description: exp.description ?? '',
                    })),
                    educations: (raw.educations ?? []).map((edu: Record<string, string>) => ({
                        clientId:     String(edu._id),
                        institution:  edu.institution  ?? '',
                        degree:       edu.degree       ?? '',
                        fieldOfStudy: edu.fieldOfStudy ?? '',
                        startDate:    edu.startDate    ?? '',
                        endDate:      edu.endDate      ?? '',
                        grade:        edu.grade        ?? '',
                        description:  edu.description  ?? '',
                    })),
                    skills: (raw.skills ?? []).map((s: Record<string, string>) => ({
                        clientId: String(s._id),
                        name:     s.name  ?? '',
                        level:    s.level ?? 'intermediate',
                    })),
                    languages: (raw.languages ?? []).map((l: Record<string, string>) => ({
                        clientId:    String(l._id),
                        name:        l.name        ?? '',
                        proficiency: l.proficiency ?? 'conversational',
                    })),
                    certifications: (raw.certifications ?? []).map((c: Record<string, string>) => ({
                        clientId:      String(c._id),
                        name:          c.name          ?? '',
                        issuer:        c.issuer        ?? '',
                        issueDate:     c.issueDate     ?? '',
                        expiryDate:    c.expiryDate    ?? '',
                        credentialId:  c.credentialId  ?? '',
                        credentialUrl: c.credentialUrl ?? '',
                    })),
                    templateId: 'classic',
                };

                // Hydrate the Zustand store with server data
                // (overwrites any stale localStorage cache for this resumeId)
                loadDraft(resumeId, resumeDraft);

            } catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                console.error('Failed to load resume:', message);
                setError(message);
            } finally {
                setIsLoading(false);
            }
        }

        fetchAndHydrate();

        // Reset the store on unmount to clear the draft from memory
        return () => { resetDraft(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resumeId, status]);

    // ── Loading state ──────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <main id="main-content" className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div
                        className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"
                        role="status"
                        aria-label="Loading resume builder…"
                    />
                    <p className="mt-4 text-gray-600 text-sm">Loading your resume…</p>
                </div>
            </main>
        );
    }

    // ── Error state ────────────────────────────────────────────────────────────
    if (error) {
        return (
            <main id="main-content" className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div
                    role="alert"
                    className="max-w-md w-full bg-white rounded-2xl border border-red-200 shadow-sm p-8 text-center"
                >
                    <p className="text-red-600 font-semibold mb-2">Could not load resume</p>
                    <p className="text-gray-500 text-sm mb-6">{error}</p>
                    <button
                        type="button"
                        onClick={() => router.push('/resume')}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 transition-colors"
                    >
                        Back to My Resumes
                    </button>
                </div>
            </main>
        );
    }

    // ── Wizard ─────────────────────────────────────────────────────────────────
    return (
        <ResumeBuilderLayout title={draft.title}>
            <StepRenderer step={currentStep} />
        </ResumeBuilderLayout>
    );
}
