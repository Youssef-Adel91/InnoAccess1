'use client';

import { useRef } from 'react';

/**
 * Extracts the YouTube video ID from any common YouTube URL format.
 * Returns null if the URL is not a valid YouTube link.
 */
function extractYouTubeId(url: string): string | null {
    const regex =
        /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

interface YouTubePlayerProps {
    /** Full YouTube URL (e.g. https://www.youtube.com/watch?v=abc123) */
    youtubeUrl: string;
    /** Descriptive title for the video — used by screen readers (WCAG 2.1 requirement) */
    title: string;
}

/**
 * Accessible YouTube player component.
 *
 * WCAG 2.1 AAA compliance:
 *  - <iframe> has a meaningful `title` attribute read by screen readers.
 *  - "Skip YouTube player" links before/after the iframe let keyboard users
 *    bypass the player without getting trapped inside it.
 *  - The wrapper uses `aspect-ratio` to remain responsive on all viewports.
 */
export function YouTubePlayer({ youtubeUrl, title }: YouTubePlayerProps) {
    const afterPlayerRef = useRef<HTMLDivElement>(null);
    const videoId = extractYouTubeId(youtubeUrl);

    if (!videoId) {
        return (
            <div
                role="alert"
                className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800"
            >
                Invalid YouTube URL. Cannot display the video player.
            </div>
        );
    }

    const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;

    return (
        <div>
            {/*
             * ── Skip link: Before the player ──
             * Keyboard users can skip directly past the iframe.
             * Visible on focus ([:focus] is styled via Tailwind's focus-visible utilities).
             */}
            <a
                href="#after-youtube-player"
                className="sr-only focus:not-sr-only focus:inline-block focus:mb-2 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:font-medium"
            >
                Skip YouTube player
            </a>

            {/* ── Responsive 16:9 wrapper ── */}
            <div
                className="relative w-full overflow-hidden rounded-lg bg-black"
                style={{ aspectRatio: '16 / 9' }}
            >
                <iframe
                    src={embedUrl}
                    /*
                     * WCAG 2.1 criterion 4.1.2 — the `title` attribute identifies the
                     * embedded content for screen readers (NVDA, VoiceOver, JAWS).
                     */
                    title={title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    loading="lazy"
                    className="absolute inset-0 w-full h-full border-0"
                    /*
                     * tabIndex={0} ensures the iframe is reachable via Tab key,
                     * while the skip link above lets users bypass it entirely.
                     */
                    tabIndex={0}
                />
            </div>

            {/*
             * ── Skip target: After the player ──
             * Focus lands here when "Skip YouTube player" is activated.
             * tabIndex={-1} makes it programmatically focusable without
             * adding it to the natural tab order.
             */}
            <div
                id="after-youtube-player"
                ref={afterPlayerRef}
                tabIndex={-1}
                className="outline-none"
                aria-label="Content after YouTube player"
            />
        </div>
    );
}
