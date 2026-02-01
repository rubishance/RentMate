import { test, expect } from '@playwright/test';

// Mock Data
const MOCK_USER = {
    id: 'test-user-id',
    email: 'test@rentmate.io',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
};

test.describe('Critical Path', () => {
    test('should load login page', async ({ page }) => {
        await page.goto('http://localhost:5174/login');
        await expect(page).toHaveTitle(/RentMate/i);
        // Check for email input being visible (robust against i18n)
        await expect(page.locator('input[name="email"]')).toBeVisible();
    });

    // Since we can't easily mock the full Auth flow without real creds or complex mocking,
    // we will limit this initial test to checking that the App LOADS and Routes work.
    // This confirms the Build is valid and no runtime crashes on startup.
});
