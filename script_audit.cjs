const { chromium } = require('playwright');
const path = require('path');

(async () => {
    // Wait for the dev server to be ready
    console.log('Waiting for dev server...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const browser = await chromium.launch({ headless: true });
    
    // Set a large viewport to see both wizards side-by-side
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();

    console.log('Navigating to http://localhost:5173/ui-audit ...');
    await page.goto('http://localhost:5173/ui-audit', { waitUntil: 'load', timeout: 30000 });
    
    // Wait for animations
    await page.waitForTimeout(5000);

    const outDir = 'C:\\Users\\ראובן שאנס\\.gemini\\antigravity\\brain\\92ac9fbf-7c17-4faa-a0ab-2360e64d6587\\artifacts';
    const fileName = `audit_capture_${Date.now()}.png`;
    const fullPath = path.join(outDir, fileName);

    console.log(`Taking screenshot: ${fileName}`);
    await page.screenshot({ path: fullPath, fullPage: true });

    console.log(`Successfully captured ${fullPath}`);
    console.log(`Use this path in markdown: ${fullPath}`);

    await context.close();
    await browser.close();
})();
