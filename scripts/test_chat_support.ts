
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_ANON_KEY");
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/chat-support`;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
    Deno.exit(1);
}

console.log(`Testing Chat Support Function at: ${FUNCTION_URL}`);

async function testPing() {
    console.log("\n--- Sending PING ---");
    try {
        const start = Date.now();
        const res = await fetch(FUNCTION_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                messages: [{ role: "user", content: "ping" }]
            })
        });

        const text = await res.text();
        const duration = Date.now() - start;
        console.log(`Status: ${res.status}`);
        console.log(`Duration: ${duration}ms`);
        console.log(`Response: ${text}`);
    } catch (e) {
        console.error("Ping Failed:", e);
    }
}

testPing();
