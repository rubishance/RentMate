const express = require('express');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai');
const { Resend } = require('resend'); // Add Resend SDK
const { fromBuffer } = require('pdf2pic');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3002;

// --- Security Middleware ---
app.use(helmet()); // Secure HTTP headers
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
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// --- Email Endpoint ---
app.post('/api/send-email', async (req, res) => {
    try {
        const { to, subject, html, tenantName } = req.body;

        // Basic Validation
        if (!to || !subject || !html) {
            return res.status(400).json({ error: 'Missing required email fields' });
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
    // Use .single() for single file upload
    upload.single('contractFile')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: `Upload Error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const safeFilename = req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        console.log('Processing file:', safeFilename, `(${req.file.size} bytes)`);

        let base64Image;
        let mimeType = req.file.mimetype;

        // Convert PDF to image if needed
        if (req.file.mimetype === 'application/pdf') {
            console.log('Converting PDF to image...');
            try {
                const options = {
                    density: 200,
                    saveFilename: "temp",
                    savePath: "./",
                    format: "png",
                    width: 2000,
                    height: 2000
                };

                const convert = fromBuffer(req.file.buffer, options);
                const pageToConvert = 1; // First page only
                const result = await convert(pageToConvert, { responseType: "buffer" });

                base64Image = result.buffer.toString('base64');
                mimeType = 'image/png';
                console.log('PDF converted to PNG successfully');
            } catch (pdfError) {
                console.error('PDF conversion error:', pdfError);
                return res.status(500).json({
                    error: 'Failed to convert PDF',
                    details: pdfError.message
                });
            }
        } else {
            // Already an image
            base64Image = req.file.buffer.toString('base64');
        }

        const dataUrl = `data:${mimeType};base64,${base64Image}`;

        const prompt = `You are an elite AI Legal Expert specializing in Israeli Real Estate Law.
        Analyze the contract (Hebrew) and extract data with **proof quotes**.

        ### Guidelines:
        1. **Structure**: For every field, return an object: { "value": ..., "quote": "Exact Hebrew text from contract" }.
        2. **OCR/Dates**: Fix OCR errors. Standardize dates (YYYY-MM-DD).
        3. **Missing**: If not found, set "value": null.

        ### Target JSON Structure:
        {
            "property": { "value": "Address", "quote": "..." },
            "tenantName": { "value": "Name", "quote": "..." },
            "tenantID": { "value": "ID", "quote": "..." },
            "tenantEmail": { "value": "Email", "quote": "..." },
            "tenantPhone": { "value": "Phone", "quote": "..." },
            "amount": { "value": 5000, "quote": "..." },
            "currency": { "value": "ILS", "quote": "..." },
            "freq": { "value": "Monthly", "quote": "..." },
            "start": { "value": "YYYY-MM-DD", "quote": "..." },
            "end": { "value": "YYYY-MM-DD", "quote": "..." },
            "linkageType": { "value": "CPI", "quote": "..." },
            "baseIndexDate": { "value": "YYYY-MM-DD", "quote": "..." },
            "parking": { "value": true, "quote": "..." },
            "storage": { "value": true, "quote": "..." },
            "painting": { "value": true, "quote": "..." },
            "furniture": { "value": "Bed, Closet", "quote": "..." },
            "paymentMethod": { "value": "Checks", "quote": "..." },
            "guarantees": { "value": "Bank Guarantee", "quote": "..." },
            "renewals": { "value": [{"title": "Option", "desc": "Details"}], "quote": "Verbatim option clause" },
            "comments": { "value": "Notes", "quote": "..." }
        }`;

        // Prepare content array for OpenAI
        const content = [
            { type: "text", text: prompt },
            {
                type: "image_url",
                image_url: {
                    url: dataUrl,
                    detail: "high" // Force high resolution analysis
                }
            }
        ];

        const response = await openai.chat.completions.create({
            model: "gpt-4o", // Upgraded from mini to full GPT-4o for better OCR
            messages: [{ role: "user", content: content }],
            response_format: { type: "json_object" },
            max_tokens: 2000,
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
