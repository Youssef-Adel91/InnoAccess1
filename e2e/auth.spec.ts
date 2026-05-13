import { test, expect } from '@playwright/test';

test('User can navigate to register and see form fields', async ({ page }) => {
    await page.goto('/');

    // Assuming there's a link to login/register in the header
    await page.getByRole('link', { name: /Sign In|Login/i }).click();

    // Wait for login page
    await expect(page.getByRole('heading', { name: /Sign In|Login/i })).toBeVisible();

    // Navigate to register 
    await page.getByRole('link', { name: /create a new account|Sign Up/i }).click();

    // Verify mandatory form fields exist for accessibility
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Register|Create Account/i })).toBeVisible();
});
