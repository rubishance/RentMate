const fs = require('fs');
const https = require('https');

const dirs = fs.readdirSync('supabase/functions', { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.') && dirent.name !== '_shared')
    .map(dirent => dirent.name);

const PROJECT_ID = 'tipnjnfbbnbskdlodrww';
const BASE_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/`;

// Generic payload to avoid payload parsing crash (TypeError)
const genericPayload = { 
    message: 'ping', 
    user_id: 'ping-id', 
    user_name: 'ping-user', 
    user_email: 'ping@a.com',
    query: 'test',
    period: 'current_month'
};

async function smokeTest() {
    let successCount = 0;
    let failCount = 0;
    
    for (const func of dirs) {
        process.stdout.write(`Pinging ${func.padEnd(30, '.')} `);
        try {
            const resp = await fetch(`${BASE_URL}${func}`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(genericPayload) 
            });
            const status = resp.status;
            
            // Wait for body to log properly on failure
            const bodyText = await resp.text();
            
            if (status >= 200 && status < 500 && status !== 404) {
                console.log(`[OK] HTTP ${status}`);
                successCount++;
            } else {
                console.log(`[FAIL] HTTP ${status} | Err: ${bodyText.substring(0, 150)}`);
                failCount++;
            }
        } catch (err) {
            console.log(`[ERROR] ${err.message}`);
            failCount++;
        }
    }
    
    console.log(`\nSmoke test finished. Total: ${dirs.length}, Success: ${successCount}, Fail: ${failCount}`);
}

smokeTest();
