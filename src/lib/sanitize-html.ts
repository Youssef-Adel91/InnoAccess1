import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes HTML strings to prevent XSS attacks.
 * Allows basic formatting tags suitable for Job descriptions and Course modules.
 */
export const sanitizeHtml = (dirtyHtml: string): string => {
    if (!dirtyHtml) return '';
    return DOMPurify.sanitize(dirtyHtml, {
        ALLOWED_TAGS: [
            'b', 'i', 'em', 'strong', 'a', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'br', 'span', 'div'
        ],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    });
};
