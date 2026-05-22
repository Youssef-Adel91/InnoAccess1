import sanitizeHtmlLib from 'sanitize-html';

/**
 * Sanitizes HTML strings to prevent XSS attacks.
 * Uses sanitize-html (pure Node.js, no jsdom dependency) instead of
 * isomorphic-dompurify which caused ERR_REQUIRE_ESM crashes on Vercel.
 * Allows basic formatting tags suitable for Job descriptions and Course modules.
 */
export const sanitizeHtml = (dirtyHtml: string): string => {
    if (!dirtyHtml) return '';
    return sanitizeHtmlLib(dirtyHtml, {
        allowedTags: [
            'b', 'i', 'em', 'strong', 'a', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'br', 'span', 'div'
        ],
        allowedAttributes: {
            'a': ['href', 'target', 'rel'],
            '*': ['class'],
        },
    });
};
