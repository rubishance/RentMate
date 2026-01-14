const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('Using Key:', process.env.GEMINI_API_KEY ? 'Present' : 'Missing');

    // There isn't a direct listModels method on the genAI instance in the Node SDK easily exposed 
    // without using the ModelManager, but we can try a simple generation with a known model 
    // to see if it's the model or the key.

    const modelsToTest = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-1.5-flash-001'];

    for (const name of modelsToTest) {
        console.log(`Testing model: ${name}`);
        const model = genAI.getGenerativeModel({ model: name });
        try {
            const result = await model.generateContent("Hello?");
            console.log(`SUCCESS with ${name}`);
        } catch (error) {
            console.error(`FAILED ${name}:`, error.message);
        }
    }
}

listModels();
