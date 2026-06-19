import { Font } from '@react-pdf/renderer';

/**
 * pdfFonts — Single registration point for all PDF fonts.
 *
 * ── Why a separate module? ────────────────────────────────────────────────────
 * @react-pdf/renderer calls Font.register() at module evaluation time. If
 * ClassicTemplate.tsx is imported in multiple places (e.g., both PreviewStep
 * and the export API route), Font.register() would be called multiple times for
 * the same family. @react-pdf throws a warning and can corrupt the font cache.
 *
 * Exporting a single registerResumeFonts() function that guards with a flag
 * makes registration idempotent — safe to call from anywhere.
 *
 * ── URL strategy ─────────────────────────────────────────────────────────────
 * Font files live in /public/fonts/ and are committed to the repo.
 *
 * Server-side (renderToBuffer in Next.js API route):
 *   fetch() used internally by @react-pdf requires an ABSOLUTE URL.
 *   We derive the base from NEXTAUTH_URL (always set in Vercel env vars).
 *
 * Client-side (PDFViewer / PDFDownloadLink in the browser):
 *   The browser can resolve relative URLs, so we use an empty string prefix.
 *
 * ── Fonts used ────────────────────────────────────────────────────────────────
 *   LTR resumes (English): Inter — matches the platform UI font exactly.
 *   RTL resumes (Arabic):  Amiri — full Unicode BiDi + Arabic ligature support.
 */

let fontsRegistered = false;

export function registerResumeFonts(): void {
    if (fontsRegistered) return;

    // ── Environment-aware base URL ────────────────────────────────────────────
    // On the server: NEXTAUTH_URL = "https://inno-access1.vercel.app" (no trailing slash)
    // In the browser: '' resolves /fonts/... as a relative path from the origin
    const base =
        typeof window === 'undefined'
            ? (process.env.NEXTAUTH_URL ?? 'http://localhost:3000')
            : '';

    // ── Cairo (Supports both LTR and RTL Arabic/English) ──────────────────────
    // Cairo is a modern Arabic/Latin typeface that supports full Unicode BiDi
    // and correct Arabic contextual forms (initial, medial, final, isolated).
    Font.register({
        family: 'Cairo',
        fonts: [
            {
                src:        `${base}/fonts/Cairo-Regular.ttf`,
                fontWeight: 'normal',
                fontStyle:  'normal',
            },
            {
                src:        `${base}/fonts/Cairo-Bold.ttf`,
                fontWeight: 'bold',
                fontStyle:  'normal',
            },
        ],
    });

    // ── Hyphenation: disable for resumes ──────────────────────────────────────
    // @react-pdf's default hyphenation callback can split names and technical
    // terms mid-word. Disabling it keeps resume content readable.
    Font.registerHyphenationCallback((word) => [word]);

    fontsRegistered = true;
}
