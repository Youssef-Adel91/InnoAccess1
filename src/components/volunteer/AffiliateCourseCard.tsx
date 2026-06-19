'use client';

import { useState, useCallback } from 'react';
import { GraduationCap, Copy, Check, ExternalLink } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface AffiliateCourse {
    _id:          string;
    title:        string;
    description:  string;
    thumbnail?:   string;
    price:        number;
    isFree:       boolean;
    courseType:   'RECORDED' | 'LIVE';
    categoryId?:  { name: string } | null;
}

interface AffiliateCourseCardProps {
    course:         AffiliateCourse;
    affiliateCode:  string;
    /** Current user's commission rate from their tier (e.g. 0.10, 0.15, 0.20) */
    commissionRate?: number;
    /** Human-readable tier label (e.g. "10%", "15%", "20%") */
    tierLabel?:      string;
    /** Tier name (e.g. "Starter", "Pro", "Elite") */
    tierName?:       string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Strips HTML tags from a description string (for clipboard plain-text). */
function stripHtml(html: string): string {
    return html
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function formatEGP(amount: number): string {
    return new Intl.NumberFormat('ar-EG', {
        style: 'currency', currency: 'EGP', maximumFractionDigits: 0,
    }).format(amount);
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AffiliateCourseCard({
    course,
    affiliateCode,
    commissionRate = 0.10,
    tierLabel      = '10%',
    tierName       = 'Starter',
}: AffiliateCourseCardProps) {
    const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
    const [announcement, setAnnouncement] = useState('');

    // Normalize price from cents to EGP
    const coursePriceEGP = course.price / 100;

    // ── Build the affiliate URL ──────────────────────────────────────────────
    const affiliateUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://innoaccess.vercel.app'}/courses/${course._id}?ref=${affiliateCode}`;

    // ── Smart Copy ───────────────────────────────────────────────────────────
    /**
     * Copies the composite share text to the clipboard.
     *
     * Format (as specified in the plan):
     *   [Course Title]
     *
     *   [Course Description — HTML stripped]
     *
     *   ✅ سجّل الآن عبر رابطي الخاص:
     *   [Unique Affiliate URL]
     *
     * Uses navigator.clipboard (async, modern) with a textarea fallback for
     * older browsers or non-HTTPS contexts (e.g. local dev on HTTP).
     */
    const handleSmartCopy = useCallback(async () => {
        const plainDescription = stripHtml(course.description);
        const shareText = [
            course.title,
            '',
            plainDescription,
            '',
            '✅ سجّل الآن عبر رابطي الخاص:',
            affiliateUrl,
        ].join('\n');

        try {
            // Modern Clipboard API (requires HTTPS or localhost)
            await navigator.clipboard.writeText(shareText);
            setCopyState('copied');
            setAnnouncement('Copied! Text is ready to paste.');
        } catch {
            // Fallback: create a textarea, select its content, execCommand
            try {
                const ta = document.createElement('textarea');
                ta.value = shareText;
                ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                setCopyState('copied');
                setAnnouncement('Copied! Text is ready to paste.');
            } catch {
                setCopyState('error');
                setAnnouncement('Copy failed. Please copy the link manually.');
            }
        }

        // Reset to idle after 2.5 seconds
        setTimeout(() => {
            setCopyState('idle');
            setAnnouncement('');
        }, 2500);
    }, [course.title, course.description, affiliateUrl]);

    const isCopied = copyState === 'copied';
    const isError  = copyState === 'error';

    return (
        <article
            className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col"
            aria-label={`Affiliate card for ${course.title}`}
        >
            {/* Thumbnail */}
            <div className="relative h-44 bg-gradient-to-br from-blue-100 to-indigo-100 flex-shrink-0">
                {course.thumbnail ? (
                    <img
                        src={course.thumbnail}
                        alt=""
                        aria-hidden="true"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center" aria-hidden="true">
                        <GraduationCap className="h-16 w-16 text-blue-300" />
                    </div>
                )}

                {/* Price badge */}
                <div className="absolute top-3 left-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                        course.isFree
                            ? 'bg-emerald-500 text-white'
                            : 'bg-blue-600 text-white'
                    }`}>
                        {course.isFree ? 'Free' : formatEGP(coursePriceEGP)}
                    </span>
                </div>

                {/* Type badge */}
                <div className="absolute top-3 right-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        course.courseType === 'LIVE'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-800 text-white'
                    }`}>
                        {course.courseType === 'LIVE' ? '🔴 LIVE' : '▶ RECORDED'}
                    </span>
                </div>
            </div>

            {/* Body */}
            <div className="p-4 flex flex-col flex-1 gap-3">
                {/* Category */}
                {course.categoryId?.name && (
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md self-start">
                        {course.categoryId.name}
                    </span>
                )}

                <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
                    {course.title}
                </h3>

                <p className="text-xs text-gray-500 line-clamp-2 flex-1">
                    {stripHtml(course.description)}
                </p>

                {/* Commission note — only for paid courses */}
                {!course.isFree && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-emerald-700">
                                💰 You earn <strong>{formatEGP(Math.round(coursePriceEGP * commissionRate))}</strong> per sale
                            </p>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white shrink-0">
                                {tierName} · {tierLabel}
                            </span>
                        </div>
                    </div>
                )}

                {course.isFree && (
                    <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                        <p className="text-xs text-gray-500">
                            ℹ️ No commission on free courses — but sharing builds goodwill!
                        </p>
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 mt-auto pt-1">
                    {/* Smart Copy button */}
                    <button
                        type="button"
                        onClick={handleSmartCopy}
                        aria-label={
                            isCopied ? 'Copied to clipboard!'
                            : isError ? 'Copy failed — try again'
                            : `Copy share text for ${course.title}`
                        }
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                            isCopied
                                ? 'bg-emerald-500 text-white focus-visible:ring-emerald-500'
                                : isError
                                    ? 'bg-red-500 text-white focus-visible:ring-red-500'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500'
                        }`}
                    >
                        {isCopied ? (
                            <><Check className="h-4 w-4" aria-hidden="true" /> Copied!</>
                        ) : isError ? (
                            <><Copy className="h-4 w-4" aria-hidden="true" /> Failed</>
                        ) : (
                            <><Copy className="h-4 w-4" aria-hidden="true" /> Copy &amp; Share</>
                        )}
                    </button>

                    {/* View course link */}
                    <a
                        href={affiliateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`View ${course.title} (opens in new tab)`}
                        className="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                </div>
            </div>

            {/* Accessible live region for copy announcements */}
            <p
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="sr-only"
            >
                {announcement}
            </p>
        </article>
    );
}
