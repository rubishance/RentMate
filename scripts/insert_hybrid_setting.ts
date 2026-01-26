
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { error } = await supabase
        .from('system_settings')
        .insert([
            {
                key: 'hybrid_chat_mode',
                value: true,
                description: 'Enable rule-based menu before AI chat to reduce costs.'
            }
        ])
        .select();

    if (error) {
        if (error.code === '23505') { // Unique violation
            console.log('Setting already exists, skipping.');
        } else {
            console.error('Error inserting setting:', error);
        }
    } else {
        console.log('Setting inserted successfully.');
    }
}

run();
