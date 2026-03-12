const https = require('https');
const fs = require('fs');

const URL = 'https://qfvrekvugdjnwhnaucmz.supabase.co/functions/v1/chat-support';
const ANON_KEY = 'sb_publishable_3nV93e7E6AXGTNoSRPv2Xg_yd1NY6ey'; // Extracted from .env

const payload = JSON.stringify({
    messages: [
        {
            role: 'system',
            content: "USER UPLOADED FILE: test.pdf. Storage Path: private/test.pdf. MANDATORY INSTRUCTION: You MUST call the 'list_properties' tool to see the user's available properties before trying to organize this document! Help the user organize this file using available tools."
        },
        {
            role: 'user',
            content: 'Please organize this document'
        }
    ],
    conversationId: null,
    hasAiConsent: true
});

const req = https.request(URL, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY
    }
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('Response:', data));
});

req.on('error', console.error);
req.write(payload);
req.end();
