async function testCbs() {
    const series = {
        cpi: '120010',
        housing: '40010',
        construction: '200010'
    };

    console.log('Testing CBS API...');
    for (const [name, id] of Object.entries(series)) {
        try {
            // Trying a different endpoint Mentioned in some sources
            const url = `https://api.cbs.gov.il/index/data/price_selected_b?id=${id}&lang=he&format=json`;
            console.log(`Fetching ${name} from ${url}...`);
            const resp = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json'
                }
            });
            const text = await resp.text();
            console.log(`Response length: ${text.length}`);
            console.log(`Response body: ${text}`);
            if (text.length > 0 && text.startsWith('{')) {
                const data = JSON.parse(text);
                const points = data.month || data.day || data.data || [];
                console.table(points.slice(0, 5).map(p => ({
                    date: p.date,
                    value: p.value
                })));
            } else {
                console.log('Empty response received.');
            }
        } catch (err) {
            console.error(`Failed to fetch ${name}:`, err);
        }
    }
}

testCbs();
