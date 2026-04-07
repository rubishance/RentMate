const PROJECT_ID = 'tipnjnfbbnbskdlodrww';
const BASE_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/`;

async function test(func) {
    try {
        const resp = await fetch(BASE_URL + func, { method: 'POST', body: JSON.stringify({}) });
        console.log(`${func}: HTTP ${resp.status}`);
    } catch (e) {
        console.log(`${func}: ERROR ${e.message}`);
    }
}
async function run() {
    await test('chat-support');
    await test('smart-function');
}
run();
