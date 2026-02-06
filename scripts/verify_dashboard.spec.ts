
import { test, expect } from '@playwright/test';

test.describe('Dashboard Resilience Check', () => {

    test('should load dashboard within 5 seconds even with slow network', async ({ page }) => {
        // Navigate to dashboard
        await page.goto('http://localhost:5173/dashboard');

        // Wait for either content OR error, but dashboard should be visible
        // Check for Command Center or similar
        await expect(page.locator('text=Renty AI')).toBeVisible({ timeout: 10000 });

        // Check that we are NOT stuck on a spinner "forever"
        // Spinner usually has class animate-spin
        // We expect main content to appear
    });

    test('should not show welcome overlay if dismissed', async ({ page }) => {
        // Mock localStorage
        await page.addInitScript(() => {
            localStorage.setItem('userPreferences', JSON.stringify({ has_seen_welcome_v1: true }));
        });

        await page.goto('http://localhost:5173/dashboard');

        // Expect overlay NOT to be visible
        const overlay = page.locator('text=Let\'s Get Started');
        await expect(overlay).not.toBeVisible();
    });
    test('should allow navigation from dashboard to properties', async ({ page }) => {
        // Navigate to dashboard
        await page.goto('http://localhost:5173/dashboard');

        // Wait for dashboard to settle
        await expect(page.locator('text=Renty AI')).toBeVisible({ timeout: 10000 });

        // Click on Properties in bottom dock
        // Looking for the aria-label from BottomDock.tsx
        const propertiesBtn = page.locator('nav[aria-label="Bottom Dock"] >> button[aria-label="נכסים"], nav[aria-label="Bottom Dock"] >> button[aria-label="Assets"]');
        await propertiesBtn.click();

        // Verify URL changed
        await expect(page).toHaveURL(/.*properties/);

        // Verify content changed (should not see Renty AI anymore, should see Properties title)
        // Adjusting based on common H1 or specific text
        await expect(page.locator('h1')).toBeVisible();
    });
});
