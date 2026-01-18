// Google Places API Configuration
// Get your API key from: https://console.cloud.google.com/

const GOOGLE_PLACES_CONFIG = {
    // IMPORTANT: Replace 'YOUR_API_KEY_HERE' with your actual Google Places API key
    apiKey: 'YOUR_API_KEY_HERE',

    // Autocomplete options
    autocompleteOptions: {
        componentRestrictions: { country: 'il' }, // Restrict to Israel
        fields: ['address_components', 'formatted_address', 'geometry', 'name'],
        types: ['address'] // Focus on street addresses
    },

    // Default language
    language: 'he'
};

// Check if API key is configured
if (GOOGLE_PLACES_CONFIG.apiKey === 'YOUR_API_KEY_HERE') {
    console.warn('⚠️ Google Places API key not configured. Please add your API key to js/google-places-config.js');
}
