'use client';

import { useEffect, useRef } from 'react';
import { useResumeStore } from '@/store/useResumeStore';

/**
 * useAutoSave
 *
 * Watches the Zustand draft for changes and debounces a PATCH call to
 * /api/resumes/:id after `delayMs` of inactivity (default 2000ms).
 *
 * ── Design decisions ──────────────────────────────────────────────────────────
 *
 * WHY useRef for the timer (not useState):
 *   The timer ID never needs to trigger a re-render. Using useState would
 *   cause an extra render cycle every time we set/clear the timer, which
 *   would happen on every keystroke — exactly what we're trying to avoid.
 *
 * WHY we send the full draft (not a diff):
 *   Computing a diff is complex and error-prone. The PATCH handler uses $set
 *   with individual fields, so sending the full draft is safe and idempotent.
 *   The auto-save payload is typically ~2KB — negligible.
 *
 * WHY we check isDirty:
 *   Without it, the hook would fire a PATCH every `delayMs` ms even when
 *   nothing has changed (e.g., on every page re-mount). isDirty is set to
 *   false immediately after a successful save, preventing pointless requests.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   // Mount once at the wizard root
 *   useAutoSave();
 */
export function useAutoSave(delayMs = 2000) {
    const { resumeId, isDirty, draft, setSaveStatus, markSaved, setResumeId } =
        useResumeStore.getState() as ReturnType<typeof useResumeStore.getState>;

    // Use a stable ref to always access the latest store values in the effect
    const storeRef = useRef(useResumeStore.getState());

    useEffect(() => {
        return useResumeStore.subscribe((state) => {
            storeRef.current = state;
        });
    }, []);

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const state = storeRef.current;

        // Don't save if nothing changed or there's no server-side resume yet
        if (!state.isDirty || !state.resumeId) return;

        // Clear any pending timer
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(async () => {
            const currentState = storeRef.current;
            if (!currentState.isDirty || !currentState.resumeId) return;

            currentState.setSaveStatus('saving');

            try {
                const res = await fetch(`/api/resumes/${currentState.resumeId}`, {
                    method:  'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify(currentState.draft),
                });

                if (!res.ok) {
                    throw new Error(`Save failed: ${res.status}`);
                }

                currentState.markSaved(new Date());

            } catch (err) {
                console.error('Auto-save error:', err);
                currentState.setSaveStatus('error');
            }
        }, delayMs);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    // Re-run whenever the draft changes (isDirty flips to true on every draft mutation)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeRef.current.isDirty, storeRef.current.draft]);
}
