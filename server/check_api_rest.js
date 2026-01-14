// Native fetch used
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;

async function checkModels() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log('Status:', response.status);
        if (data.models) {
            console.log('Available Models:', data.models.map(m => m.name));
        } else {
            console.log('Error Body:', JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('Fetch Error:', error);
    }
}

checkModels();
