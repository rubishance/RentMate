import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qfvrekvugdjnwhnaucmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdnJla3Z1Z2RqbndobmF1Y216Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MzY0MTYsImV4cCI6MjA4MzAxMjQxNn0.xA3JI4iGElpIpZjVHLCA_FGw0hfmNUJTtw_fuLlhkoA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkPlans() {
    console.log('Checking subscription_plans table...');
    const { data, error } = await supabase.from('subscription_plans').select('*');
    if (error) {
        console.error('Error fetching plans:', error);
    } else {
        // Log count and IDs
        console.log(`Found ${data?.length} plans.`);
        if (data && data.length > 0) {
            console.log('Plan IDs:', data.map(p => p.id));
        } else {
            console.log('No plans found.');
        }
    }
}

checkPlans();
