import fetch from 'node-fetch';

async function testCbsApi() {
    console.log("Fetching CPI from CBS...");
    // 120010 is CPI
    const url = 'https://api.cbs.gov.il/index/data/price?id=120010&format=json&download=false';
    const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36' }
    });
    console.log("Status:", response.status);
    const json = await response.json();
    console.log(JSON.stringify(json.month[0], null, 2));
}

testCbsApi().catch(console.error);
