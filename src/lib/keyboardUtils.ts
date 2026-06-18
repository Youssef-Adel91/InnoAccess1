/**
 * Keyboard utility helpers for InnoAccess.
 *
 * ─── Backspace / Browser-Back Bug ────────────────────────────────────────────
 * Problem:
 *   In some browser/OS combinations, pressing Backspace inside a password
 *   input triggers the browser's "Go Back" navigation. This happens because
 *   the KeyboardEvent bubbles up from the input → form → document, where
 *   the browser's built-in history listener intercepts it.
 *
 * Fix:
 *   Call e.stopPropagation() to prevent the event from reaching the document.
 *   DO NOT call e.preventDefault() — that would block the character deletion
 *   inside the input itself, breaking normal typing.
 *
 * Usage:
 *   <input type="password" onKeyDown={stopBackspacePropagation} ... />
 */
export function stopBackspacePropagation(
    e: React.KeyboardEvent<HTMLInputElement>
): void {
    if (e.key === 'Backspace' || e.key === 'Delete') {
        // Stop bubbling to document-level history listeners.
        // This does NOT prevent the character from being deleted in the input.
        e.stopPropagation();
    }
}
