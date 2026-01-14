import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate that environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
    console.error('CRITICAL: Missing Supabase environment variables! VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY are missing.');
    // Avoid crashing immediately, let createClient fail or use empty strings if needed, 
    // but better to just let it proceed and fail gracefully later.
}

const isConfigured = supabaseUrl && supabaseAnonKey;

export const isSupabaseConfigured = !!isConfigured;

export const supabase = createClient(
    isConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
    isConfigured ? supabaseAnonKey : 'placeholder-key'
);
