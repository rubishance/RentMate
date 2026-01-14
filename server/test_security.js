const fs = require('fs');
const http = require('http');

// Helper to make requests
function makeRequest(filename, contentType) {
    return new Promise((resolve, reject) => {
        const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
        const postData =
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="contractFile"; filename="${filename}"\r\n` +
            `Content-Type: ${contentType}\r\n\r\n` +
            `Test Content\r\n` +
            `--${boundary}--\r\n`;

        const options = {
            hostname: 'localhost',
            port: 3002,
            path: '/api/scan-contract',
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                resolve({ statusCode: res.statusCode, body });
            });
        });

        req.on('error', (e) => reject(e));
        req.write(postData);
        req.end();
    });
}

async function runTests() {
    console.log('--- Starting Security Tests ---');

    // 1. Test Invalid File Type
    console.log('\n1. Testing Invalid File Type (Text file)...');
    try {
        const res = await makeRequest('bad.txt', 'text/plain');
        console.log(`Status: ${res.statusCode}`);
        console.log(`Body: ${res.body}`);
        if (res.statusCode === 400 && res.body.includes('Invalid file type')) {
            console.log('✅ PASS: Invalid file rejected.');
        } else {
            console.log('❌ FAIL: Invalid file not rejected correctly.');
        }
    } catch (e) { console.error(e); }

    // 2. Test Rate Limiting
    console.log('\n2. Testing Rate Limiting (Spamming requests)...');
    let limitHit = false;
    for (let i = 0; i < 25; i++) {
        process.stdout.write(`.`); // Progress dot
        const res = await makeRequest('good.pdf', 'application/pdf');
        if (res.statusCode === 429) {
            limitHit = true;
            console.log(`\n✅ PASS: Rate limit hit at request #${i + 1}`);
            console.log(`Response: ${res.body}`);
            break;
        }
    }

    if (!limitHit) {
        console.log('\n❌ FAIL: Rate limit was NOT hit after 25 requests.');
    }
}

runTests();
