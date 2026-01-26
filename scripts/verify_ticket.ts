
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
);

async function verify() {
    console.log('Verifying latest ticket...');
    const { data: tickets, error } = await supabase
        .from('support_tickets')
        .select(`
            id, 
            title, 
            description, 
            priority,
            ticket_analysis (
                sentiment_score,
                urgency_level,
                ai_summary
            )
        `)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (tickets && tickets.length > 0) {
        console.log('Latest Ticket:', JSON.stringify(tickets[0], null, 2));
    } else {
        console.log('No tickets found.');
    }
}

verify();
