import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;

if (!SUPABASE_URL) {
    console.error("Error: VITE_SUPABASE_URL is required in .env");
    process.exit(1);
}

// ---------------------
// TEST CONFIG
// ---------------------
const TEST_EMAIL = `test_prospect_${Date.now()}@example.com`;
const TEST_SUBJECT = "Question about Management Fees and Guarantee";
const TEST_BODY = "Hi, I'm a landlord with 5 properties. I'm interested in your service. Can you explain your fee structure? Also, do you guarantee rent if the tenant defaults? Thanks, Dan.";

async function runTest() {
    console.log(`\n🚀 STARTING INTELLIGENT AUTOPILOT TEST (HTTP ONLY)`);
    console.log(`target_email: ${TEST_EMAIL}`);

    const payload = {
        from: TEST_EMAIL,
        to: "sales@rentmate.co.il",
        subject: TEST_SUBJECT,
        text: TEST_BODY,
        messageId: `<test-${Date.now()}@mail.gmail.com>`
    };

    console.log("\n📨 Sending Payload to handle-inbound-email...");

    const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/handle-inbound-email`;
    console.log(`Target URL: ${FUNCTION_URL}`);

    try {
        const res = await fetch(FUNCTION_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // "Authorization": `Bearer ${...}` // Not needed if --no-verify-jwt
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const txt = await res.text();
            console.error(`❌ HTTP Error: ${res.status} ${res.statusText}`);
            console.error(`   Body: ${txt}`);
            return;
        }

        const data = await res.json();
        console.log("\n✅ Response Code: 200 OK");
        console.log("Response Body:", JSON.stringify(data, null, 2));

        // ASSERTIONS
        if (data.success === true && data.ai === true) {
            console.log("\n🎉 SUCCESS: Function executed and AI analysis ran!");
        } else if (data.success === true && data.ai === false) {
            console.log("\n⚠️ WARNING: Function success, but AI did NOT run (Check OPENAI_API_KEY in Supabase Secrets).");
        } else {
            console.log("\n❌ FAILURE: Unexpected response signature.");
        }

    } catch (e) {
        console.error("❌ Failed to call Edge Function.", e);
        return;
    }

    console.log("\n🏁 Test Complete.");
}

runTest();
