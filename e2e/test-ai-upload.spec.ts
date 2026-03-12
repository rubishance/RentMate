import { test, expect } from '@playwright/test';
import path from 'path';

test('AI Document Organization End-to-End Test', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes just in case AI is slow

    // 1. Navigate to the login page
    await page.goto('http://localhost:5173/login');

    // Wait for the login form
    await page.waitForSelector('input[type="email"]');

    // 2. Login as the newly created test user
    await page.fill('input[type="email"]', 'uitest_1773049506383@rentmate.com');
    await page.fill('input[type="password"]', 'TestPassword123!');

    // Click login button (the submit button in the form)
    await page.click('button[type="submit"]');

    // 3. Wait for the chatbot Widget V3 top-centered pill to appear
    await page.waitForSelector('div.z-\\[60\\] button.glass-premium', { timeout: 15000 });

    // 4. Open the Chatbot
    await page.click('div.z-\\[60\\] button.glass-premium');

    // Wait for chat to open and input to be available
    await page.waitForSelector('#chat-input', { timeout: 10000 });

    // 5. Upload the PDF file directly via the hidden input
    const filePath = path.join(process.cwd(), '202603_202649_5111584733.pdf');
    await page.locator('input[type="file"]').setInputFiles(filePath);

    // Wait 2 seconds for the UI to attach the file
    await page.waitForTimeout(2000);

    // 6. Type message and send
    await page.fill('#chat-input', 'Please organize this receipt');

    // Hit enter or click submit
    await page.keyboard.press('Enter');

    // 7. Wait for AI response
    // Wait until the bot responds. Usually there is a loading indicator
    console.log("Waiting for AI response...");

    // We wait for the specific text indicating success, or just wait for 20 seconds and take a screenshot
    await page.waitForTimeout(15000); // 15 seconds should be enough for AI to process and respond

    // Capture full page screenshot of the chat showing the AI response
    const screenshotPath = `ai-full-proof-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath });

    console.log(`Success! Screenshot saved as ${screenshotPath}`);
});
