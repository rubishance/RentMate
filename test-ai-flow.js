import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'https://qfvrekvugdjnwhnaucmz.supabase.co';
const ANON_KEY = 'sb_publishable_3nV93e7E6AXGTNoSRPv2Xg_yd1NY6ey';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

// Replace this with the actual JWT token copied from the browser
const USER_TOKEN = process.argv[2];

async function runAIFlowTest() {
    if (!USER_TOKEN) {
        console.error("❌ Please provide your JWT token as an argument:\n   node test-ai-flow.js <YOUR_JWT_TOKEN>");
        return;
    }

    console.log("🚀 Starting E2E AI Flow Test using LIVE USER SESSION");

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(USER_TOKEN);
        if (authError) throw authError;

        const userId = user.id;
        console.log(`✅ Authenticated as real user: ${userId}`);

        // Set the token on the global client so storage uploads use it
        supabase.auth.setSession({ access_token: USER_TOKEN, refresh_token: '' });

        // 1. UPLOAD THE PDF BILL
        const storagePath = `users/${userId}/ai_test_bill_${Date.now()}.pdf`;

        console.log(`\n1️⃣ Uploading WeCom Bill to Storage...`);
        const pdfFileName = '202603_202649_5111584733.pdf';
        const pdfBuffer = fs.readFileSync(path.join(process.cwd(), pdfFileName));

        const { error: uploadError } = await supabase.storage
            .from('secure_documents')
            .upload(storagePath, pdfBuffer, {
                contentType: 'application/pdf',
                upsert: true
            });

        if (uploadError) throw uploadError;
        console.log(`✅ PDF Uploaded successfully to ${storagePath}`);

        // 2. INVOKE AI CHAT
        console.log(`\n2️⃣ Triggering AI Chat to organize the document...`);
        const apiMessages = [
            {
                role: 'system',
                content: `USER UPLOADED FILE: ${pdfFileName}. Storage Path: ${storagePath}. MANDATORY INSTRUCTION: You MUST call the 'list_properties' tool to see the user's available properties before trying to organize this document! Help the user organize this file using available tools.`
            },
            {
                role: 'user',
                content: 'Please organize this document'
            }
        ];

        const { data: aiData, error: aiError } = await supabase.functions.invoke('chat-support', {
            body: {
                messages: apiMessages,
                hasAiConsent: true // Force true for local testing script
            },
            headers: {
                Authorization: `Bearer ${USER_TOKEN}`
            }
        });

        if (aiError) throw aiError;

        console.log(`\n🤖 AI Response:`);
        console.log(JSON.stringify(aiData.choices?.[0]?.message, null, 2));

        // 3. CHECK FINAL DOCUMENT MOVEMENT
        if (aiData.choices?.[0]?.message?.tool_calls) {
            console.log("\n✅ AI called tools:", JSON.stringify(aiData.choices[0].message.tool_calls, null, 2));
            const toolCall = aiData.choices[0].message.tool_calls[0];
            if (toolCall.function.name === 'list_properties') {
                console.log("✅ PERFECT: The AI correctly decided to list properties before doing anything else!");
            }
        } else {
            console.log("\n❌ AI responded with text only. It did NOT trigger any background tools.");
        }

    } catch (err) {
        console.error("\n❌ TEST FAILED:", err);
    }
}

runAIFlowTest();
