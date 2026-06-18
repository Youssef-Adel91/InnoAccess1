'use client';

import { CheckCircle, Loader2, AlertCircle, Clock } from 'lucide-react';
import { useResumeSaveStatus, useResumeLastSavedAt } from '@/store/useResumeStore';
import type { SaveStatus } from '@/store/useResumeStore';

/**
 * AutoSaveIndicator
 *
 * A non-intrusive status chip bound to the Zustand saveStatus.
 *
 * ── a11y ──────────────────────────────────────────────────────────────────────
 * Uses aria-live="polite" so screen readers announce status changes without
 * interrupting the user mid-sentence.
 *
 * aria-atomic="true" ensures the entire status string is read as a unit
 * (not just the characters that changed).
 *
 * The visual icon is aria-hidden="true" — the text label carries the meaning.
 *
 * ── Visual design ─────────────────────────────────────────────────────────────
 * Stays in the top-right of the wizard header. Small and muted so it doesn't
 * compete with the form content. Only the 'error' state uses a colour that
 * demands attention.
 */

const STATUS_CONFIG: Record<
    SaveStatus,
    { label: string; Icon: React.FC<{ className?: string }>; className: string }
> = {
    idle:   { label: 'Unsaved changes',  Icon: Clock,       className: 'text-gray-400' },
    saving: { label: 'Saving…',          Icon: Loader2,     className: 'text-blue-500' },
    saved:  { label: 'Saved',            Icon: CheckCircle, className: 'text-green-600' },
    error:  { label: 'Save failed',      Icon: AlertCircle, className: 'text-red-600'  },
};

export function AutoSaveIndicator() {
    const status      = useResumeSaveStatus();
    const lastSavedAt = useResumeLastSavedAt();

    const { label, Icon, className } = STATUS_CONFIG[status];

    // Format "Saved 3 minutes ago" for the tooltip / SR hint
    const savedAgoText = lastSavedAt
        ? `Last saved ${formatRelativeTime(lastSavedAt)}`
        : '';

    return (
        <div
            // This wrapper announces changes to screen readers
            aria-live="polite"
            aria-atomic="true"
            aria-label={savedAgoText || label}
            className="flex items-center gap-1.5 text-xs font-medium select-none"
            title={savedAgoText || label}
        >
            <Icon
                className={`h-3.5 w-3.5 ${className} ${status === 'saving' ? 'animate-spin' : ''}`}
                aria-hidden="true"
            />
            <span className={className}>{label}</span>
        </div>
    );
}

/** Returns a human-readable relative time string from an ISO date string. */
function formatRelativeTime(isoString: string): string {
    const diff = Date.now() - new Date(isoString).getTime();
    const seconds = Math.floor(diff / 1000);

    if (seconds < 10)  return 'just now';
    if (seconds < 60)  return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
}
