/**
 * Focus management utilities for accessibility
 */

/**
 * Set focus on an element with a slight delay to ensure it's rendered
 */
export function setFocus(elementId: string, delay: number = 100): void {
    setTimeout(() => {
        const element = document.getElementById(elementId);
        if (element) {
            element.focus();
        }
    }, delay);
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
    ];

    return Array.from(container.querySelectorAll(focusableSelectors.join(', '))) as HTMLElement[];
}

/**
 * Trap focus within a container (useful for modals)
 */
export function trapFocus(container: HTMLElement): () => void {
    const focusableElements = getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement?.focus();
            }
        } else {
            // Tab
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement?.focus();
            }
        }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Return cleanup function
    return () => {
        container.removeEventListener('keydown', handleKeyDown);
    };
}

/**
 * Restore focus to previously focused element
 */
export function createFocusRestorer(): () => void {
    const previouslyFocused = document.activeElement as HTMLElement;

    return () => {
        if (previouslyFocused && previouslyFocused.focus) {
            previouslyFocused.focus();
        }
    };
}
