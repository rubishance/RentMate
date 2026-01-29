import { createClient } from '@supabase/supabase-js';

// Helper to safely get env vars in Browser (Vite) or Node (Scripts)
const getEnv = (key: string) => {
    // Check Vite first
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
        return (import.meta as any).env[key];
    }
    // Check Node
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key];
    }
    return undefined;
};

// Get Supabase credentials
const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

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
