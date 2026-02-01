
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdnJla3Z1Z2RqbndobmF1Y216Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQzNjQxNiwiZXhwIjoyMDgzMDEyNDE2fQ._Fmq-2x4zpzPkHP9btdqSUj0gbX7RmqscwvGElNbdNA';
const supabase = createClient(supabaseUrl, serviceKey);

async function testWebhooks() {
    console.log('--- SHARED TRIGGER TEST ---');

    const { data: users } = await supabase.from('user_profiles').select('id').limit(1);
    if (!users || users.length === 0) return;
    const userId = users[0].id;

    console.log(`Testing support_tickets with User ID: ${userId}`);

    const { error: ticketError } = await supabase.from('support_tickets').insert({
        user_id: userId,
        title: 'Test Ticket',
        description: 'This is a test of the webhook trigger', // Corrected column name
        category: 'technical',
        status: 'open',
        priority: 'medium'
    });

    if (ticketError) {
        console.log(`Support Ticket Insert FAILED: [${ticketError.code}] ${ticketError.message}`);
    } else {
        console.log('Support Ticket Insert SUCCESS');
        // Cleanup if success
        await supabase.from('support_tickets').delete().eq('title', 'Test Ticket');
    }
}

testWebhooks().catch(console.error);
