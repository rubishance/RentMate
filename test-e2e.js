import fs from 'fs';

const SUPABASE_URL = 'https://qfvrekvugdjnwhnaucmz.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdnJla3Z1Z2RqbndobmF1Y216Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQzNjQxNiwiZXhwIjoyMDgzMDEyNDE2fQ._Fmq-2x4zpzPkHP9btdqSUj0gbX7RmqscwvGElNbdNA';

async function run() {
    let results = [];

    // Step 1
    try {
        const res1 = await fetch(`${SUPABASE_URL}/functions/v1/get-system-stats`, { method: 'POST' });
        const text1 = await res1.text();
        results.push({ step: 1, status: res1.status, body: text1 });
    } catch(e) {
        results.push({ step: 1, error: e.message });
    }

    // Step 2
    try {
        const res2 = await fetch(`${SUPABASE_URL}/functions/v1/generate-protocol-pdf`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: ''
        });
        const text2 = await res2.text();
        results.push({ step: 2, status: res2.status, body: text2 });
    } catch(e) {
        results.push({ step: 2, error: e.message });
    }

    // Wait
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 3
    try {
        const res3 = await fetch(`${SUPABASE_URL}/functions/v1/get-system-stats`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        const text3 = await res3.text();
        results.push({ step: 3, status: res3.status, body: text3 });
    } catch(e) {
        results.push({ step: 3, error: e.message });
    }

    fs.writeFileSync('test-e2e-results.json', JSON.stringify(results, null, 2));
    console.log("Done");
}

run();
