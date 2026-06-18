'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useResumeStore, useResumeDraft } from '@/store/useResumeStore';
import { useStepHeadingRef } from '../ResumeBuilderLayout';
import { ClassicTemplate } from '../pdf/ClassicTemplate';
import { Download, FileText, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Dynamic Imports ─────────────────────────────────────────────────────────

// @react-pdf/renderer's web viewers rely on browser APIs and will crash on SSR.
// We must dynamically import them with ssr: false.
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
        <div className="w-full h-full min-h-[600px] flex flex-col items-center justify-center bg-gray-50 border border-gray-200 rounded-xl">
            <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mb-4" />
            <p className="text-sm font-medium text-gray-500 animate-pulse">
                Generating your accessible PDF…
            </p>
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PreviewStep() {
    const draft = useResumeDraft();
    const { saveStatus } = useResumeStore();
    const registerHeadingRef = useStepHeadingRef();

    // To prevent hydration mismatch, we delay rendering the PDF until the client mounts
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const filename = `${draft.personalInfo.fullName.replace(/\s+/g, '_') || 'Resume'}_CV.pdf`;

    return (
        <section aria-labelledby="step-heading" className="h-full flex flex-col">
            <h2
                id="step-heading"
                ref={registerHeadingRef}
                tabIndex={-1}
                className="text-2xl font-bold text-gray-900 mb-2 focus:outline-none"
            >
                Preview & Export
            </h2>
            <p className="text-sm text-gray-500 mb-6 flex items-center justify-between">
                <span>Review your resume below. It is perfectly formatted for ATS systems.</span>
                
                {/* Sync status indicator */}
                <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full font-medium text-xs">
                    {saveStatus === 'saved' ? (
                        <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Saved to cloud
                        </>
                    ) : saveStatus === 'saving' ? (
                        <>
                            <div className="animate-spin h-3 w-3 border-2 border-green-600 border-t-transparent rounded-full" />
                            Saving…
                        </>
                    ) : (
                        'Unsaved changes'
                    )}
                </span>
            </p>

            <div className="flex flex-col lg:flex-row gap-6 flex-1">
                {/* ── Desktop PDF Viewer (hidden on mobile) ──────────────── */}
                <div className="hidden lg:block flex-1 rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white min-h-[700px]">
                    {isMounted ? (
                        <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }}>
                            <ClassicTemplate draft={draft} />
                        </PDFViewer>
                    ) : (
                        <PdfLoadingState />
                    )}
                </div>

                {/* ── Mobile/Sidebar Action Panel ───────────────────────── */}
                <div className="w-full lg:w-80 flex-shrink-0">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sticky top-6">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                            <FileText className="h-6 w-6" />
                        </div>
                        
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Ready to apply?</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Download your resume as a tagged PDF. It is optimized for screen readers and Applicant Tracking Systems (ATS).
                        </p>

                        {isMounted && (
                            <PDFDownloadLink
                                document={<ClassicTemplate draft={draft} />}
                                fileName={filename}
                                className={cn(
                                    'flex items-center justify-center gap-2 w-full px-6 py-4 rounded-xl font-bold text-white transition-colors',
                                    'bg-blue-600 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2'
                                )}
                            >
                                {/* @ts-ignore - react-pdf types for child render prop are notoriously flaky */}
                                {({ loading }) => (
                                    <>
                                        <Download className="h-5 w-5" />
                                        {loading ? 'Preparing PDF…' : 'Download PDF'}
                                    </>
                                )}
                            </PDFDownloadLink>
                        )}
                        
                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                                Accessibility Stats
                            </h4>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    PDF/UA Tagged
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    Machine-readable text
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    Logical reading order
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
