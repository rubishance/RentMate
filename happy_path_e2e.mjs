import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const PROJECT_ID = 'tipnjnfbbnbskdlodrww';
const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;

// Use actual keys exported previously (from your local env)
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false }});
const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false }});

async function runHappyPath() {
    console.log("=== HAPPY PATH E2E TEST: START ===");
    console.log("1. Provisioning Legitimate User & Data...");
    
    // Create Landlord
    const email = `landlord_${Date.now()}@e2e.local`;
    const password = 'HappyPassword123!';
    const { data: landlordUser, error: uErr } = await adminClient.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { first_name: 'Legit', last_name: 'Landlord' }
    });
    if (uErr) throw uErr;
    const landlordId = landlordUser.user.id;
    console.log(`✅ Landlord created: ${landlordId}`);

    // Create Property
    const { data: asset, error: asErr } = await adminClient.from('properties').insert({
        user_id: landlordId,
        address: 'E2E Testing HQ',
        city: 'Tel Aviv'
    }).select('id').single();
    if (asErr) throw asErr;
    console.log(`✅ Property created: ${asset.id}`);

    // Create Protocol
    const { data: protocol, error: prErr } = await adminClient.from('property_protocols').insert({
        property_id: asset.id,
        status: 'draft',
        type: 'move_in',
        date: new Date().toISOString()
    }).select('id').single();
    if (prErr) throw prErr;
    console.log(`✅ Protocol created: ${protocol.id}`);

    // Create WhatsApp Conversation
    const { data: conv, error: cvErr } = await adminClient.from('whatsapp_conversations').insert({
        user_id: landlordId
    }).select('id').single();
    if (cvErr) throw cvErr;
    console.log(`✅ WhatsApp Conversation created: ${conv.id}`);

    console.log("\n2. Acquiring Legit User JWT...");
    const { data: auth, error: authErr } = await userClient.auth.signInWithPassword({ email, password });
    if (authErr) throw authErr;
    const token = auth.session.access_token;
    console.log("✅ Token successfully obtained.");

    console.log("\nWaiting 2 seconds for read-replicas to sync...");
    await new Promise(r => setTimeout(r, 2000));

    console.log("\n=== EXECUTING FUNCTIONS (IDOR & LATENCY CHECK) ===");

    // Test 1: Generate Protocol PDF
    console.log(`\n-> Invoking /generate-protocol-pdf for Protocol: ${protocol.id}`);
    const t0_pdf = performance.now();
    const resPdf = await fetch(`${SUPABASE_URL}/functions/v1/generate-protocol-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ protocolId: protocol.id })
    });
    const t1_pdf = performance.now();
    const pdfLatency = (t1_pdf - t0_pdf).toFixed(2);
    const pdfStatus = resPdf.status;
    // We expect 200 or potentially 500 if storage upload fails, but NOT 403 or 401.
    const pdfBodyText = await resPdf.text();
    console.log(`[PDF Result]: Status: ${pdfStatus} (Latency: ${pdfLatency} ms)`);
    if (pdfStatus === 403 || pdfStatus === 401) {
         console.log(`❌ FALSE POSITIVE: PDF Generator incorrectly blocked landlord. Body: ${pdfBodyText}`);
    } else {
         console.log(`✅ PDF Generator permitted access correctly (Passed Auth Guard).`);
         if(pdfStatus !== 200) console.log(`   Internal Function Output: ${pdfBodyText}`); // E.g. Missing logo or missing DB tables?
    }

    // Test 2: WhatsApp Outbound
    console.log(`\n-> Invoking /send-whatsapp-outbound for Conversation: ${conv.id}`);
    const t0_wa = performance.now();
    const resWa = await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp-outbound`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ conversationId: conv.id, message: { type: 'text', text: 'Testing from E2E suite' } })
    });
    const t1_wa = performance.now();
    const waLatency = (t1_wa - t0_wa).toFixed(2);
    const waStatus = resWa.status;
    const waBodyText = await resWa.text();
    console.log(`[WhatsApp Result]: Status: ${waStatus} (Latency: ${waLatency} ms)`);
    
    // We expect it to reach Meta API and possibly fail there (400) or succeed, but not 403 or 401.
    if (waStatus === 403 || waStatus === 401) {
         console.log(`❌ FALSE POSITIVE: WhatsApp Outbound incorrectly blocked landlord. Body: ${waBodyText}`);
    } else {
         console.log(`✅ WhatsApp Outbound permitted access correctly (Passed Auth Guard).`);
         if(waStatus !== 200) console.log(`   Internal Function Output: ${waBodyText}`); // Often throws Meta Error if config missing or fake destination
    }

    // Cleanup
    console.log("\n=== CLEANUP ===");
    await adminClient.auth.admin.deleteUser(landlordId);
    await adminClient.from('properties').delete().eq('user_id', landlordId);
    await adminClient.from('whatsapp_conversations').delete().eq('user_id', landlordId);
    console.log("✅ Cleanup complete. E2E Test Finished.");

    fs.writeFileSync('e2e_report.json', JSON.stringify({
        pdfStatus, waStatus, pdfLatency, waLatency,
        pdfBodyText, waBodyText
    }, null, 2));

}

runHappyPath().catch(console.error);
