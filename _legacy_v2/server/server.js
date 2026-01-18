const express = require('express');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai');
const { Resend } = require('resend'); // Add Resend SDK
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();


const app = express();
const port = process.env.PORT || 3002;

// --- Security Middleware ---
// app.use(helmet()); // Default Helmet is too strict for CDNs/Inline scripts
app.use(
    helmet.contentSecurityPolicy({
        useDefaults: true,
        directives: {
            "default-src": ["'self'"],
            "script-src": [
                "'self'",
                "'unsafe-inline'",
                "'unsafe-eval'", // Needed for some dev tools or older libs
                "https://unpkg.com",
                "https://cdn.jsdelivr.net",
                "https://polyfill.io",
                "https://*.googleapis.com",
                "https://*.supabase.co",
                "https://*.supabase.in"
            ],
            "style-src": [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com",
                "https://unpkg.com"
            ],
            "font-src": [
                "'self'",
                "https://fonts.gstatic.com",
                "data:"
            ],
            "img-src": [
                "'self'",
                "data:",
                "blob:",
                "https://images.unsplash.com",
                "https://*.supabase.co"
            ],
            "connect-src": [
                "'self'",
                "https://*.supabase.co",
                "https://*.supabase.in",
                "https://maps.googleapis.com",
                "https://unpkg.com",
                "https://fonts.googleapis.com",
                "https://cdn.jsdelivr.net",
                "https://polyfill.io"
            ],
        },
    })
);
const allowedOrigins = [
    'http://localhost:8080',
    'http://localhost:3000',
    'https://rentmate.netlify.app',
    'https://rentmate.co.il',
    'https://www.rentmate.co.il'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            if (process.env.NODE_ENV === 'production') {
                // return callback(new Error('Not allowed by CORS')); // Strict
                return callback(null, true); // Soft launch
            }
        }
        return callback(null, true);
    }
}));
app.use(express.json());

// Serve Static Files from Parent Directory (Frontend)
app.use(express.static(path.join(__dirname, '../')));


// Rate Limiting: 20 requests per hour per IP
const scanLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    message: { error: 'Too many scan requests, please try again later.' }
});

// --- File Upload Security ---
// 10MB Limit, specific file types only
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, Word, JPEG, and PNG are allowed.'));
        }
    }
});

// Initialize OpenAI
let openai;
try {
    if (process.env.OPENAI_API_KEY) {
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    } else {
        console.warn('WARNING: OPENAI_API_KEY missing in .env');
    }
} catch (e) {
    console.warn('Error initializing OpenAI:', e.message);
}

// Initialize Resend
let resend;
try {
    if (process.env.RESEND_API_KEY) {
        resend = new Resend(process.env.RESEND_API_KEY);
    } else {
        console.warn('WARNING: RESEND_API_KEY missing in .env. Email features will be disabled.');
    }
} catch (e) {
    console.warn('Error initializing Resend:', e.message);
}

// --- Email Endpoint ---
app.post('/api/send-email', async (req, res) => {
    try {
        const { to, subject, html, tenantName } = req.body;

        // Basic Validation
        if (!to || !subject || !html) {
            return res.status(400).json({ error: 'Missing required email fields' });
        }

        if (!resend) {
            return res.status(503).json({ error: 'Email service is not configured (Missing API Key)' });
        }

        const data = await resend.emails.send({
            from: 'RentMate <onboarding@resend.dev>', // Update this with your verified domain later
            to: ['delivered@resend.dev'], // Force test email for safety in dev/free tier
            // to: [to], // Uncomment for production
            subject: subject,
            html: html,
        });

        console.log('Email sent successfully:', data);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Email sending failed:', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

app.post('/api/scan-contract', scanLimiter, (req, res, next) => {
    // Use .array() for multiple file upload
    upload.array('contractImages')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: `Upload Error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        let files = req.files;
        // Fallback or check
        if (!files || files.length === 0) {
            if (req.file) files = [req.file];
            else return res.status(400).json({ error: 'No contract images uploaded' });
        }

        console.log(`Processing ${files.length} contract pages...`);

        // Prepare content array for OpenAI
        // We will construct the prompt and content below using the 'files' array


        const prompt = `You are an elite AI Legal Expert specializing in Israeli Real Estate Law.
        Analyze the contract (Hebrew) and extract data with **proof quotes**.

        ### Guidelines:
        1. **Language**: STRICTLY EXTRACT VALUES IN THE ORIGINAL LANGUAGE (HEBREW). DO NOT TRANSLATE TO ENGLISH.
           - Example: If the contract says "תל אביב", extract "תל אביב". DO NOT extract "Tel Aviv".
           - Example: If the contract says "צ'קים", extract "צ'קים". DO NOT extract "Checks".
        2. **Structure**: For every field, return an object: { "value": ..., "quote": "Exact Hebrew text from contract", "confidenceScore": 0-100 }.
        3. **Confidence**: Be conservative.
           - 90-100: Explicitly stated and unambiguous.
           - 70-89: Strongly implied or standard language.
           - < 50: Ambiguous or not found (return null for value).
        4. **OCR/Dates**: Fix OCR errors. Standardize dates (YYYY-MM-DD). format.
        5. **Missing**: If not found, set "value": null.

        ### Target JSON Structure:
        {
            "property": {
                "city": { "value": "תל אביב", "quote": "...", "confidenceScore": 95 },
                "street": { "value": "רוטשילד", "quote": "...", "confidenceScore": 95 },
                "buildingParam": { "value": "12", "quote": "...", "confidenceScore": 95 },
                "aptNum": { "value": "4", "quote": "...", "confidenceScore": 90 }
            },
            "tenant": {
                "name": { "value": "ישראל ישראלי", "quote": "...", "confidenceScore": 95 },
                "id": { "value": "123456789", "quote": "...", "confidenceScore": 95 },
                "email": { "value": "email@example.com", "quote": "...", "confidenceScore": 80 },
                "phone": { "value": "050-1234567", "quote": "...", "confidenceScore": 80 }
            },
            "contractDates": {
                "signingDate": { "value": "YYYY-MM-DD", "quote": "...", "confidenceScore": 90 },
                "startDate": { "value": "YYYY-MM-DD", "quote": "...", "confidenceScore": 95 },
                "endDate": { "value": "YYYY-MM-DD", "quote": "...", "confidenceScore": 95 },
                "optionPeriod": { "value": "12 חודשים", "quote": "...", "confidenceScore": 70 }
            },
            "financials": {
                "amount": { "value": 5000, "quote": "...", "confidenceScore": 95 },
                "currency": { "value": "ILS", "quote": "...", "confidenceScore": 95 },
                "paymentFrequency": { "value": "חודשי", "quote": "...", "confidenceScore": 90 },
                "paymentDay": { "value": 1, "quote": "...", "confidenceScore": 85 },
                "paymentMethod": { "value": "צ'קים", "quote": "...", "confidenceScore": 80 }
            },
            "linkage": {
                "type": { "value": "מדד המחירים לצרכן", "quote": "...", "confidenceScore": 90 },
                "baseIndexDate": { "value": "YYYY-MM-DD", "quote": "...", "confidenceScore": 80 },
                "baseIndexValue": { "value": 105.2, "quote": "...", "confidenceScore": 80 }
            },
            "security": {
                 "depositAmount": { "value": 10000, "quote": "...", "confidenceScore": 90 },
                 "guarantees": { "value": "ערבות בנקאית", "quote": "...", "confidenceScore": 80 }
            },
            "specs": {
                "petsAllowed": { "value": true, "quote": "...", "confidenceScore": 70 },
                "parking": { "value": true, "quote": "...", "confidenceScore": 85 },
                "furniture": { "value": "מלא", "quote": "...", "confidenceScore": 70 }
            }
        }`;

        // Prepare content array for OpenAI
        const content = [
            { type: "text", text: prompt }
        ];

        for (const file of files) {
            const base64Image = file.buffer.toString('base64');
            const dataUrl = `data:${file.mimetype};base64,${base64Image}`;
            content.push({
                type: "image_url",
                image_url: {
                    url: dataUrl,
                    detail: "high"
                }
            });
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: content }],
            response_format: { type: "json_object" },
            max_tokens: 4000,
        });

        const responseContent = response.choices[0].message.content;

        console.log('OpenAI Response:', responseContent);

        const data = JSON.parse(responseContent);
        console.log('Extracted Data:', data);
        res.json(data);

    } catch (error) {
        console.error('Error processing contract with OpenAI:', error);
        res.status(500).json({
            error: 'Failed to process contract',
            details: error.message,
        });
    }
});

app.listen(port, () => {
    console.log(`RentMate Server (OpenAI) running at http://localhost:${port}`);
});
