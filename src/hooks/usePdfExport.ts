'use client';

import { useState, useCallback } from 'react';

export type PdfExportStatus = 'idle' | 'exporting' | 'done' | 'error';

interface UsePdfExportReturn {
    /** Trigger a server-side PDF generation and Vercel Blob upload. */
    triggerExport: () => Promise<void>;
    /** True while the server is rendering and uploading the PDF. */
    isExporting:   boolean;
    /** The Vercel Blob URL of the last successfully exported PDF. */
    exportedUrl:   string | null;
    /** Error message from the last failed export, or null. */
    exportError:   string | null;
    /** Current lifecycle status for driving button label / spinner logic. */
    status:        PdfExportStatus;
    /** Reset status back to 'idle' (e.g. when the user edits the resume again). */
    reset:         () => void;
}

/**
 * usePdfExport
 *
 * Calls POST /api/resumes/[id]/export-pdf, waits for the server to render the
 * PDF and upload it to Vercel Blob, then returns the public URL.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   const { triggerExport, isExporting, exportedUrl, exportError } =
 *       usePdfExport(resumeId);
 *
 *   <button onClick={triggerExport} disabled={isExporting || !resumeId}>
 *       {isExporting ? 'Generating…' : 'Save & Get Link'}
 *   </button>
 *
 *   {exportedUrl && <a href={exportedUrl} target="_blank">Open PDF</a>}
 *
 * ── Why not SWR/React Query? ──────────────────────────────────────────────────
 * This is a mutation, not a query — it is user-triggered, not auto-fetched.
 * A simple useState + fetch is the correct, dependency-free approach here.
 *
 * ── Why does it auto-open the URL? ───────────────────────────────────────────
 * Opening the PDF immediately after generation provides instant feedback that
 * the export succeeded. The user can still copy the URL from the UI.
 * We use window.open (not an anchor click) to avoid the browser blocking
 * a programmatically triggered navigation mid-async-function.
 */
export function usePdfExport(resumeId: string | null): UsePdfExportReturn {
    const [status,      setStatus]      = useState<PdfExportStatus>('idle');
    const [exportedUrl, setExportedUrl] = useState<string | null>(null);
    const [exportError, setExportError] = useState<string | null>(null);

    const reset = useCallback(() => {
        setStatus('idle');
        setExportError(null);
        // Do NOT clear exportedUrl — the user may still want to copy the link
    }, []);

    const triggerExport = useCallback(async () => {
        if (!resumeId) {
            setExportError('Resume must be saved before exporting to PDF.');
            setStatus('error');
            return;
        }

        if (status === 'exporting') return; // Prevent double-click

        setStatus('exporting');
        setExportError(null);

        try {
            const res = await fetch(`/api/resumes/${resumeId}/export-pdf`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            const json = await res.json() as {
                success: boolean;
                data?:   { url: string };
                error?:  { message: string };
            };

            if (!res.ok || !json.success || !json.data?.url) {
                throw new Error(json.error?.message ?? `Export failed (HTTP ${res.status})`);
            }

            setExportedUrl(json.data.url);
            setStatus('done');

            // Auto-open the PDF in a new tab after successful generation
            window.open(json.data.url, '_blank', 'noopener,noreferrer');

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'PDF export failed. Please try again.';
            setExportError(message);
            setStatus('error');
            console.error('❌ usePdfExport error:', err);
        }
    }, [resumeId, status]);

    return {
        triggerExport,
        isExporting: status === 'exporting',
        exportedUrl,
        exportError,
        status,
        reset,
    };
}
