import fetch from 'node-fetch';

async function test() {
    const url = 'https://api.cbs.gov.il/index/data/price?id=120010&format=json&download=false&startPeriod=01-2004&endPeriod=12-2010';
    console.log("Fetching", url);
    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const j = await res.json();
    const arr = j?.month?.[0]?.date || [];
    console.log("Length:", arr.length);
    if(arr.length) console.log("First/Last:", arr[0].year, arr[arr.length-1].year);
}
test().catch(console.error);
