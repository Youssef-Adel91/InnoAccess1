'use client';

import { useRef, useImperativeHandle, forwardRef } from 'react';

/**
 * LiveRegion — A visually hidden ARIA live region.
 *
 * Screen readers announce any text set via the `announce()` imperative method.
 * The region itself is invisible but always present in the DOM so the
 * announcement fires reliably (adding/removing aria-live regions mid-session
 * is unreliable across screen readers).
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   const liveRef = useRef<LiveRegionHandle>(null);
 *
 *   // Inside an event handler:
 *   liveRef.current?.announce('New experience added. Entry 3 of 3.');
 *
 *   <LiveRegion ref={liveRef} />
 *
 * ── politeness levels ─────────────────────────────────────────────────────────
 *
 *   'polite'     — AT finishes the current sentence before announcing.
 *                  Use for: add/remove/move success messages.
 *
 *   'assertive'  — AT interrupts immediately.
 *                  Use for: form validation failure counts only.
 *                  (Never use for routine interactions — it is jarring.)
 *
 * ── Implementation note ───────────────────────────────────────────────────────
 *
 *   We DON'T use React state to drive the text content because React's
 *   reconciliation can batch updates and delay the DOM write, causing some
 *   screen readers to miss the announcement. Instead we write directly to
 *   `textContent` via a ref — this guarantees the mutation is synchronous and
 *   immediate.
 *
 *   The trick to force re-announcement of the SAME message (e.g., "Item added"
 *   twice in a row) is to clear the region first, then set the new text in the
 *   next microtask tick via a short setTimeout(0). Some SRs only announce when
 *   the content actually changes.
 */

export interface LiveRegionHandle {
    /** Announce a message to screen readers. Clears first to force re-announcement. */
    announce: (message: string) => void;
}

interface LiveRegionProps {
    /** Defaults to 'polite'. Use 'assertive' only for validation error summaries. */
    politeness?: 'polite' | 'assertive';
}

export const LiveRegion = forwardRef<LiveRegionHandle, LiveRegionProps>(
    function LiveRegion({ politeness = 'polite' }, ref) {
        const regionRef = useRef<HTMLDivElement>(null);

        useImperativeHandle(ref, () => ({
            announce(message: string) {
                const el = regionRef.current;
                if (!el) return;

                // Clear first — forces re-announcement if the same string is repeated
                el.textContent = '';

                // Write in the next microtask so the SR sees the change
                setTimeout(() => {
                    if (regionRef.current) {
                        regionRef.current.textContent = message;
                    }
                }, 0);
            },
        }));

        return (
            <div
                ref={regionRef}
                role="status"
                aria-live={politeness}
                aria-atomic="true"
                // Visually hidden but always in the DOM
                className="sr-only"
            />
        );
    }
);

LiveRegion.displayName = 'LiveRegion';
