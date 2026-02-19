const SYNC_URL = 'https://qfvrekvugdjnwhnaucmz.supabase.co/functions/v1/fetch-index-data';
const ANON_KEY = 'sb_publishable_3nV93e7E6AXGTNoSRPv2Xg_yd1NY6ey';

async function triggerSync() {
    console.log(`Triggering sync at ${SYNC_URL}...`);
    try {
        const resp = await fetch(SYNC_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await resp.json();
        console.log('Sync Result:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Failed to trigger sync:', err);
    }
}

triggerSync();
