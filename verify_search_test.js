
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Need service role to bypass email verification if needed, or just use anon and hope signUp works without verification? 
// Actually, usually signUp requires verification or autCONFIRMS. 
// I'll use service role to create user or valid session? 
// No, I need to call the function AS the user.
// I'll try normal signUp. If it fails (needs email verification), I'll use service role queries to insert data and then try to login?
// Easiest: Use service role to create user, then signInWithPassword? Or just use service role to act as user?
// The Edge Function verifies the token.
// I will use normal flow.

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTest() {
    const email = `test_search_${Date.now()}@example.com`;
    const password = 'Password123!';

    console.log(`1. Creating user ${email}...`);
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) {
        console.error('SignUp Error:', authError);
        return;
    }

    const userId = authData.user?.id;
    if (!userId) {
        console.error('No user ID returned. Verification required?');
        // If verification required, we might be stuck. 
        // Let's assume dev env has auto-confirm or I can proceed.
        // If session is null, we can't call function.
        if (!authData.session) {
            console.log('No session. Attempting login (maybe user already exists or auto-confirmed?)...');
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
            if (loginError || !loginData.session) {
                console.error('Login failed or verification pending:', loginError);
                return;
            }
            authData.session = loginData.session;
        }
    }


    console.log('User authenticated.');

    // INSPECT SCHEMA
    console.log('Inspecting contracts table schema...');
    const { data: schemaData, error: schemaError } = await supabase
        .from('contracts')
        .select('*')
        .limit(1);

    if (schemaError) {
        console.error('Schema Inspect Error:', schemaError);
    } else {
        if (schemaData.length > 0) {
            console.log('Contracts Columns:', Object.keys(schemaData[0]));
        } else {
            console.log('Contracts table empty, but query successful. Trying to insert to find error.');
            // We can't see columns if empty row... 
            // But we can try to insert dummy and see error?
            // Actually, Supabase JS types might not help at runtime.
            // We will fail at insert if column invalid.
        }
    }

    // 2. Enable Consent (Update user_preferences)
    console.log('2. Enabling AI consent...');
    const { error: consentError } = await supabase
        .from('user_preferences')
        .upsert({ user_id: userId, ai_data_consent: true });

    if (consentError) console.error('Consent Error:', consentError);

    // 3. Create Property
    console.log('3. Creating Property "Hashelosha 11"...');
    const { data: property, error: propError } = await supabase
        .from('properties')
        .insert({
            user_id: userId,
            address: 'Hashelosha 11',
            city: 'Tel Aviv',
            property_type: 'penthouse', // Testing asset type search
            rooms: 4
        })
        .select()
        .single();

    if (propError) {
        console.error('Property Create Error:', propError);
        return;
    }

    // 4. Create Contract with Tenant
    console.log('4. Creating Contract with Tenant "Moshe Cohen"...');
    // Note: tenants are embedded in JSONB, but simplistic schema might require creating a tenant row first if the app does that.
    // Index.ts search reads `tenants` column (JSONB) AND `tenants` table if joined.
    // My updated code reads `tenants` JSONB column from contracts table.
    // Migration 20260126... embeds tenants.
    // So I should insert into `contracts` with `tenants` JSONB.

    const { error: contractError } = await supabase
        .from('contracts')
        .insert({
            user_id: userId,
            property_id: property.id,
            start_date: '2026-01-01',
            end_date: '2027-01-01',
            base_rent: 5000,
            status: 'active',
            tenants: [{ name: 'Moshe Cohen', phone: '0500000000' }] // JSONB array
        });

    if (contractError) {
        console.error('Contract Create Error:', contractError);
        return;
    }

    // 5. Call Chat Support Function
    console.log('5. Testing Search...');

    const testQueries = [
        'Hashelosha 11',      // Full Address
        'Tel Aviv',           // City
        'Penthouse',          // Type
        'Moshe',              // Tenant Name
        'Hashelosha Penthouse' // Mixed (Address + Type)
    ];

    for (const query of testQueries) {
        console.log(`\nSearching for: "${query}"...`);
        const { data: funcData, error: funcError } = await supabase.functions.invoke('chat-support', {
            body: {
                messages: [{ role: 'user', content: `Analyze contract ${query}` }],
                action: 'search_contracts', // Need to trigger search logic?
                // Wait, chat-support usually parses the message to decide action or intent.
                // Or I can force the intent/tool output if the function supports it?
                // The function uses an LLM to decide.
                // However, the `index.ts` I edited has `searchContracts` function, but it's called by the tool execution logic in `knowledge.ts` or main handler.
                // Actually, looking at `index.ts`, I see handling for tool calls?
                // I need to simulate the LLM *calling* the tool, OR hope the LLM inside `chat-support` calls `searchContracts`.
                // For this test, verifying end-to-end is best: Send message, see if it finds it.
                // But LLM response is text.
                // Can I verify the `searchContracts` internal logic directly?
                // No, I can only interact via the API.
                // IF the LLM works, it will output "Found contract..." or similar.
                // If it fails, it says "I couldn't find...".

                // Hack: explicit intent if supported? 
                // The code I edited: `async function searchContracts(...)`.
                // It is called when `tool.name === 'search_contracts'`.
                // So I rely on the LLM to call it.
            }
        });
        // The invoke call returns the data/response.
        // If I can't see the internal logs, I have to rely on the response text.
        // Wait, `messages: [...]`.

        // Let's hope the LLM is smart enough to use the tool.
        // To debug, check `funcData`.

        if (funcError) {
            console.error('Function call error:', funcError);
        } else {
            // The response is usually a stream or JSON.
            // If stream, this test script needs to read it.
            // Supabase invoke returns JSON usually if not streaming?
            // `chat-support` usually streams text.
            // I'll just print the whole response.
            console.log('Response:', funcData);
        }
    }

    // FETCH DEBUG LOGS (Using Service Role to bypass RLS)
    console.log('Fetching recent debug logs (admin)...');
    const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: logs, error: logsError } = await supabaseAdmin
        .from('debug_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (logsError) {
        console.error('Error fetching debug logs:', logsError);
    } else {
        console.log('Recent Debug Logs:');
        logs.forEach(log => {
            console.log(`[${log.level}] ${log.function_name}: ${log.message}`, log.details);
        });
    }

    // LIST TABLES
    console.log('Listing info schema tables...');
    const { data: tables, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

    // Supabase JS doesn't support querying information_schema directly effectively with standard client sometimes due to permissions.
    // simpler: try to insert into debug_logs and see if it fails.

    console.log('Attempting debug_log insert...');
    const { error: insertError } = await supabase.from('debug_logs').insert({
        function_name: 'test_verify',
        level: 'info',
        message: 'Test log from verify script',
        details: { time: new Date().toISOString() }
    });

    if (insertError) {
        console.error('Debug Log Insert Failed:', insertError);
        // If 404, table missing.
        // If 401, RLS.
    } else {
        console.log('Debug Log Insert Success.');
    }
}

runTest();
