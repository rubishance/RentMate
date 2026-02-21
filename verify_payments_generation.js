
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
const envPath = path.resolve(__dirname, '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = process.env.VITE_SUPABASE_URL || envConfig.VITE_SUPABASE_URL;
// Attempt to get service role key from process env or .env (it might not be in .env specific to vite)
// If running via node, we might need to pass it or rely on it being in .env if it was put there for testing.
// Usually service role key is NOT in .env for security. 
// I will rely on the user passing it or it being in the environment.
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.argv[2];

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: VITE_SUPABASE_URL is required.');
    console.error('Error: SUPABASE_SERVICE_ROLE_KEY is required. Pass it as a command line argument or set it in environment.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testPaymentGeneration() {
    console.log('--- Starting Payment Generation Verification ---');

    // 1. Get a user
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    if (userError || !users || users.length === 0) {
        console.error('Error fetching users:', userError);
        return;
    }
    const user = users[0];
    console.log(`Using user: ${user.id} (${user.email})`);

    // 2. Mock Contract Data
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

    // Create a dummy property first
    const { data: property, error: propError } = await supabase.from('properties').insert({
        user_id: user.id,
        address: 'Test Payment Gen Address ' + Date.now(),
        city: 'Tel Aviv',
        property_type: 'apartment',
        rooms: 3,
        size_sqm: 100
    }).select().single();

    if (propError || !property) {
        console.error("Failed to create property:", propError);
        return;
    }
    console.log(`Created property: ${property.id}`);

    const { data: contract, error: contractError } = await supabase.from('contracts').insert({
        user_id: user.id,
        property_id: property.id,
        status: 'active',
        start_date: startDate,
        end_date: endDate,
        base_rent: 5000,
        currency: 'ILS',
        payment_frequency: 'monthly',
        payment_day: 1
    }).select().single();

    if (contractError) {
        console.error("Failed to create contract:", contractError);
        await supabase.from('properties').delete().eq('id', property.id);
        return;
    }
    console.log(`Created contract: ${contract.id}`);

    // 3. Mock Payment Data (Simulating generate-payments output)
    const mockPayments = [
        {
            amount: 5000,
            currency: 'ILS',
            due_date: startDate,
            status: 'pending',
            original_amount: 5000,
            index_linkage_rate: 0
        }
    ];

    // 4. Attempt Insert
    const paymentsToInsert = mockPayments.map(p => ({
        ...p,
        contract_id: contract.id,
        user_id: user.id
    }));

    console.log("Attempting to insert payments:", JSON.stringify(paymentsToInsert, null, 2));

    const { data: inserted, error: insertError } = await supabase
        .from('payments')
        .insert(paymentsToInsert)
        .select();

    if (insertError) {
        console.error("❌ Linkage/Payment Insert Failed:", insertError);
    } else {
        console.log("✅ Payments Inserted Successfully:", inserted.length);
        console.log("Inserted Data:", inserted);
    }

    // Cleanup
    // await supabase.from('payments').delete().eq('contract_id', contract.id); // Cascade handled by contract delete usually
    await supabase.from('contracts').delete().eq('id', contract.id);
    await supabase.from('properties').delete().eq('id', property.id);
    console.log("Cleanup done.");
}

testPaymentGeneration();
