'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useResumeStore, useResumeDraft, useResumeId } from '@/store/useResumeStore';
import { useStepHeadingRef } from '../ResumeBuilderLayout';
import { ClassicTemplate } from '../pdf/ClassicTemplate';
import { usePdfExport } from '@/hooks/usePdfExport';
import {
    Download,
    FileText,
    CheckCircle2,
    Cloud,
    CloudUpload,
    Link2,
    AlertCircle,
    Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Dynamic Imports ──────────────────────────────────────────────────────────
// @react-pdf/renderer uses browser APIs and will crash on SSR.
const PDFViewer = dynamic(
    () => import('@react-pdf/renderer').then((mod) => mod.PDFViewer),
    { ssr: false, loading: () => <PdfLoadingState /> }
);

const PDFDownloadLink = dynamic(
    () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
    { ssr: false }
);

// ─── Loading State ────────────────────────────────────────────────────────────

function PdfLoadingState() {
    return (
        <div
            role="status"
            aria-label="Generating PDF preview"
            className="w-full h-full min-h-[600px] flex flex-col items-center justify-center bg-gray-50 border border-gray-200 rounded-xl"
        >
            <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mb-4" />
            <p className="text-sm font-medium text-gray-500 animate-pulse">
                Generating your accessible PDF…
            </p>
        </div>
    );
}

// ─── Cloud Export Button ──────────────────────────────────────────────────────

function CloudExportButton({ resumeId }: { resumeId: string | null }) {
    const { triggerExport, isExporting, exportedUrl, exportError, status } =
        usePdfExport(resumeId);

    return (
        <div className="mt-3">
            <button
                type="button"
                onClick={triggerExport}
                disabled={isExporting || !resumeId}
                aria-busy={isExporting}
                aria-label={
                    isExporting
                        ? 'Generating PDF, please wait…'
                        : 'Save PDF to cloud and get a shareable link'
                }
                className={cn(
                    'flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-xl font-semibold text-sm transition-all duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2',
                    isExporting || !resumeId
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50',
                )}
            >
                {isExporting ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Generating PDF…
                    </>
                ) : status === 'done' ? (
                    <>
                        <Cloud className="h-4 w-4" aria-hidden="true" />
                        Saved to Cloud ✓
                    </>
                ) : (
                    <>
                        <CloudUpload className="h-4 w-4" aria-hidden="true" />
                        Save &amp; Get Shareable Link
                    </>
                )}
            </button>

            {/* ── Shareable URL ──────────────────────────────────────────── */}
            {exportedUrl && status === 'done' && (
                <div
                    role="status"
                    aria-live="polite"
                    aria-label="Shareable PDF link ready"
                    className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl"
                >
                    <p className="text-xs font-semibold text-green-700 mb-1.5 flex items-center gap-1">
                        <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Shareable PDF Link
                    </p>
                    <a
                        href={exportedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline break-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                    >
                        {exportedUrl}
                    </a>
                </div>
            )}

            {/* ── Export Error ───────────────────────────────────────────── */}
            {exportError && status === 'error' && (
                <div
                    role="alert"
                    className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2"
                >
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="text-xs text-red-700">{exportError}</p>
                </div>
            )}
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function PreviewStep() {
    const draft              = useResumeDraft();
    const { saveStatus }     = useResumeStore();
    const resumeId           = useResumeId();
    const registerHeadingRef = useStepHeadingRef();

    // Delay rendering the PDF viewer until client mount to prevent hydration mismatch
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => { setIsMounted(true); }, []);

    const filename = `${draft.personalInfo.fullName.replace(/\s+/g, '_') || 'Resume'}_CV.pdf`;

    return (
        <section aria-labelledby="step-heading" className="h-full flex flex-col">

            {/* ── Heading ─────────────────────────────────────────────────── */}
            <h2
                id="step-heading"
                ref={registerHeadingRef}
                tabIndex={-1}
                className="text-2xl font-bold text-gray-900 mb-2 focus:outline-none"
            >
                Preview &amp; Export
            </h2>

            <p className="text-sm text-gray-500 mb-6 flex items-center justify-between flex-wrap gap-2">
                <span>Review your resume. It is formatted for ATS systems and screen readers.</span>

                {/* ── Auto-save status chip ────────────────────────────── */}
                <span
                    aria-live="polite"
                    aria-label={
                        saveStatus === 'saved'  ? 'All changes saved to cloud' :
                        saveStatus === 'saving' ? 'Saving changes…'            :
                        saveStatus === 'error'  ? 'Save failed'                :
                        'Unsaved changes'
                    }
                    className={cn(
                        'flex items-center gap-1.5 px-3 py-1 rounded-full font-medium text-xs',
                        saveStatus === 'saved'  && 'bg-green-50 text-green-700',
                        saveStatus === 'saving' && 'bg-yellow-50 text-yellow-700',
                        saveStatus === 'error'  && 'bg-red-50 text-red-700',
                        saveStatus === 'idle'   && 'bg-gray-100 text-gray-500',
                    )}
                >
                    {saveStatus === 'saved' && (
                        <><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Saved</>
                    )}
                    {saveStatus === 'saving' && (
                        <><Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Saving…</>
                    )}
                    {saveStatus === 'error' && (
                        <><AlertCircle className="h-3.5 w-3.5" aria-hidden="true" /> Save error</>
                    )}
                    {saveStatus === 'idle' && 'Unsaved changes'}
                </span>
            </p>

            <div className="flex flex-col lg:flex-row gap-6 flex-1">

                {/* ── Desktop PDF Viewer ───────────────────────────────────── */}
                <div className="hidden lg:block flex-1 rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white min-h-[700px]">
                    {isMounted ? (
                        <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }}>
                            <ClassicTemplate draft={draft} />
                        </PDFViewer>
                    ) : (
                        <PdfLoadingState />
                    )}
                </div>

                {/* ── Action Sidebar ───────────────────────────────────────── */}
                <div className="w-full lg:w-80 flex-shrink-0">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sticky top-6">

                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                            <FileText className="h-6 w-6" aria-hidden="true" />
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 mb-2">Ready to apply?</h3>
                        <p className="text-sm text-gray-500 mb-5">
                            Download your resume or save it to the cloud to get a permanent shareable link.
                        </p>

                        {/* ── Option 1: Instant client-side download ────────── */}
                        {isMounted && (
                            <PDFDownloadLink
                                document={<ClassicTemplate draft={draft} />}
                                fileName={filename}
                                aria-label="Download resume as PDF file"
                                className={cn(
                                    'flex items-center justify-center gap-2 w-full px-6 py-4 rounded-xl font-bold text-white transition-colors',
                                    'bg-blue-600 hover:bg-blue-700',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2',
                                )}
                            >
                                {/* @ts-ignore — react-pdf render-prop types are notoriously flaky */}
                                {({ loading }) => (
                                    <>
                                        {loading
                                            ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                                            : <Download className="h-5 w-5" aria-hidden="true" />
                                        }
                                        {loading ? 'Preparing PDF…' : 'Download PDF'}
                                    </>
                                )}
                            </PDFDownloadLink>
                        )}

                        {/* ── Option 2: Server-side export + Vercel Blob ────── */}
                        <CloudExportButton resumeId={resumeId} />

                        {/* ── Accessibility stats ───────────────────────────── */}
                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                                PDF Compliance
                            </h4>
                            <ul className="space-y-2 text-sm text-gray-600" aria-label="PDF compliance checklist">
                                {[
                                    'Real extractable text (ATS-safe)',
                                    'Correct language metadata',
                                    'Logical reading order',
                                    'Embedded accessible fonts',
                                ].map((item) => (
                                    <li key={item} className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" aria-hidden="true" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                    </div>
                </div>
            </div>
        </section>
    );
}
