import { test, expect } from '@playwright/test';

test.describe('Dashboard Stabilization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to a page first to be able to set localStorage
        await page.goto('http://localhost:5174/login');
        await page.evaluate(() => {
            window.localStorage.setItem('rentmate_e2e_bypass', 'true');
        });
    });

    test('should load dashboard without hook violations', async ({ page }) => {
        // Navigate to dashboard
        await page.goto('http://localhost:5174/');

        // Wait for potential rendering issues
        await page.waitForTimeout(2000);

        // Check for dashboard content
        // Based on Dashboard.tsx, it should have a welcome message or similar
        // Let's check for "payments" or "assets" which are typical dashboard links/titles
        const h1 = page.locator('h1');
        await expect(h1).toBeVisible();

        // Ensure no "Rendered more hooks" error message in console
        // (Playwright doesn't automatically catch React hook errors unless they crash the page,
        // which they usually do in dev mode with a big overlay).
        const errorOverlay = page.locator('vite-error-overlay');
        await expect(errorOverlay).not.toBeAttached();
    });
});
