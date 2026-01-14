/**
 * ARIA utility functions for improving accessibility
 */

/**
 * Generate a unique ID for linking labels to inputs
 */
export function generateAriaId(prefix: string): string {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create ARIA label from text by removing special characters
 */
export function sanitizeAriaLabel(text: string): string {
    return text.replace(/[^a-zA-Z0-9\s]/g, '').trim();
}

/**
 * Announce message to screen readers
 * Creates a visually hidden live region for screen reader announcements
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remove after announcement
    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

/**
 * Get ARIA props for a button based on state
 */
export function getButtonAriaProps(isPressed?: boolean, isExpanded?: boolean) {
    return {
        ...(isPressed !== undefined && { 'aria-pressed': isPressed }),
        ...(isExpanded !== undefined && { 'aria-expanded': isExpanded }),
    };
}
