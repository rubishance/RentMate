
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIndices() {
    console.log('Checking latest index data...');
    const indexTypes = ['cpi', 'housing', 'construction', 'usd', 'eur'];

    for (const type of indexTypes) {
        const { data, error } = await supabase
            .from('index_data')
            .select('*')
            .eq('index_type', type)
            .order('date', { ascending: false })
            .limit(1);

        if (error) {
            console.error(`Error fetching ${type}:`, error.message);
        } else if (data && data.length > 0) {
            console.log(`${type.toUpperCase()}: Latest date = ${data[0].date}, Value = ${data[0].value}`);
        } else {
            console.log(`${type.toUpperCase()}: No data found`);
        }
    }
}

checkIndices();
