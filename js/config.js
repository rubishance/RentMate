const CONFIG = {
    // API Keys (LOAD THESE FROM ENV VARIABLES IN PRODUCTION)
    // NEVER COMMIT REAL KEYS TO GITHUB
    RESEND_API_KEY: '', // Set in Render/Netlify Dashboard

    // SUPABASE CONFIGURATION
    supabaseUrl: 'https://qfvrekvugdjnwhnaucmz.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdnJla3Z1Z2RqbndobmF1Y216Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MzY0MTYsImV4cCI6MjA4MzAxMjQxNn0.xA3JI4iGElpIpZjVHLCA_FGw0hfmNUJTtw_fuLlhkoA',

    // AI CONFIGURATION
    OPENAI_API_KEY: '', // Set in Environment
    GEMINI_API_KEY: '', // Set in Environment
    AI_PROVIDER: 'gemini',

    // Feature Flags
    ENABLE_EMAILS: true,
    ENABLE_CLOUD_SYNC: true,

    // Environment Logic
    get API_URL() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3002';
        } else {
            return 'https://rentmate-server.onrender.com'; // FUTURE BACKEND URL
        }
    }
};

console.log('Configuration loaded');
