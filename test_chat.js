import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testChat() {
    console.log("Invoking chat-support...");
    const start = Date.now();
    try {
        const { data, error } = await supabase.functions.invoke('chat-support', {
            body: {
                messages: [{ role: 'user', content: 'What is RentMate?' }],
                hasAiConsent: true
            }
        });
        const duration = Date.now() - start;
        console.log(`Total roundtrip: ${duration}ms`);
        if (error) {
            console.error("Error:", error);
        } else {
            console.log("Perf Metrics:", data?.perfMetrics);
        }
    } catch (e) {
        console.error("Exception:", e);
    }
}

testChat();
