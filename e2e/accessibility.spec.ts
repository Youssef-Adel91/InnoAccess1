import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('WCAG 2.1 AAA Accessibility Check', () => {
    test('Homepage should pass Axe accessibility checks', async ({ page }) => {
        await page.goto('/');

        // Run axe checks against the page
        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag21a', 'wcag21aa', 'wcag21aaa'])
            .analyze();

        // Print violations to console if any
        if (accessibilityScanResults.violations.length > 0) {
            console.warn(JSON.stringify(accessibilityScanResults.violations, null, 2));
        }

        expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('Keyboard Navigation (Tab focus) works on main elements', async ({ page }) => {
        await page.goto('/');

        // Press Tab to focus the first logical element (usually Skip Link)
        await page.keyboard.press('Tab');

        // Evaluate the currently focused element
        const focusedElementTag = await page.evaluate(() => document.activeElement?.tagName);

        // We expect it to be a navigable element, e.g., an A tag (Skip to main content)
        expect(['A', 'BUTTON', 'INPUT']).toContain(focusedElementTag);
    });
});
