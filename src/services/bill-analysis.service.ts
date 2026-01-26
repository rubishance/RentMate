import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../lib/supabase';

const GEN_AI_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!GEN_AI_KEY) {
    console.warn('Missing VITE_GEMINI_API_KEY in environment variables.');
}

const genAI = new GoogleGenerativeAI(GEN_AI_KEY || '');

export class UsageLimitExceededError extends Error {
    currentUsage: number;
    limit: number;
    constructor(currentUsage: number, limit: number) {
        super('AI usage limit reached');
        this.name = 'UsageLimitExceededError';
        this.currentUsage = currentUsage;
        this.limit = limit;
    }
}

export interface ExtractedBillData {
    category: 'water' | 'electric' | 'gas' | 'municipality' | 'management' | 'internet' | 'other';
    amount: number;
    date: string; // YYYY-MM-DD
    vendor: string;
    invoiceNumber?: string;
    confidence: number;
    currency: string;
    billingPeriodStart?: string;
    billingPeriodEnd?: string;
    summary?: string;
}

export const BillAnalysisService = {
    /**
     * Checks if the user has remaining AI scans and logs the usage.
     */
    async checkAndLogUsage(count: number = 1, feature: string = 'bill_scan'): Promise<{ allowed: boolean; currentUsage: number; limit: number }> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Authentication required');

        const { data, error } = await supabase.rpc('check_and_log_ai_usage', {
            p_user_id: user.id,
            p_feature: feature,
            p_count: count
        });

        if (error) {
            console.error('Error checking AI usage:', error);
            // Default to allowing if RPC fails? Or safer to block?
            // Let's allow but log error.
            return { allowed: true, currentUsage: 0, limit: -1 };
        }

        return data as { allowed: boolean; currentUsage: number; limit: number };
    },

    /**
     * Analyzes one or more files (images/PDFs) using Gemini Flash to extract bill details.
     * Supports multi-page bills (e.g. multiple photos of the same bill).
     */
    async analyzeBill(files: File | File[]): Promise<ExtractedBillData> {
        if (!GEN_AI_KEY) {
            throw new Error('AI Service not configured. Please add API key.');
        }

        const fileArray = Array.isArray(files) ? files : [files];

        try {
            // 1. Convert Files to Base64 parts
            const parts = await Promise.all(fileArray.map(f => fileToGenerativePart(f)));

            // 2. Initialize Model
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            // 3. Define Prompt with Israeli Context
            const prompt = `
                You are a senior financial auditor specializing in the Israeli utility and property market.
                Analyze the provided document(s) and extract data into a pure JSON object.
                The documents are likely utility bills from Israeli providers.
                
                LANGUAGES: The bill might be in Hebrew. Extract names in the language they appear or English equivalent.
                
                FIELDS TO EXTRACT:
                - category: Strictly one of ['water', 'electric', 'gas', 'municipality', 'management', 'internet', 'other'].
                  * water: Mei Aviv (מי אביב), Mei Shikma (מי שקמה), Hagihon (הגיחון), etc.
                  * electric: Israel Electric Corp (חברת החשמל), or private providers like Electra Power (אלקטרה), Amisragas (אמישרגז), Cellcom Energy (סלקום), Bezeq Energy (בזק), Paza (פז).
                  * municipality: Arnona (ארנונה), City of Tel Aviv, Jerusalem, Haifa, etc.
                  * gas: Pazgas (פזגז), Amisragas (אמישרגז), Supergas (סופרגז).
                - amount: The total sum to be paid for the current period (numeric).
                - date: Billing/Invoice date (YYYY-MM-DD).
                - vendor: Service provider name.
                - invoiceNumber: The invoice or bill number (string).
                - currency: usually '₪' or 'ILS'.
                - billingPeriodStart: Service start date (YYYY-MM-DD).
                - billingPeriodEnd: Service end date (YYYY-MM-DD).
                - summary: One sentence description of the bill contents.
                - confidence: 0.0 to 1.0.

                Return ONLY the JSON.
            `;

            // 4. Generate Content
            const result = await model.generateContent([prompt, ...parts]);
            const response = await result.response;
            const text = response.text();

            // 5. Parse JSON (Handle potential markdown wrapping)
            const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(cleanedText);

            return {
                category: data.category || 'other',
                amount: typeof data.amount === 'number' ? data.amount : parseFloat(data.amount) || 0,
                date: data.date || new Date().toISOString().split('T')[0],
                vendor: data.vendor || 'Unknown Vendor',
                invoiceNumber: data.invoiceNumber || '',
                confidence: data.confidence || 0.5,
                currency: data.currency || 'ILS',
                billingPeriodStart: data.billingPeriodStart,
                billingPeriodEnd: data.billingPeriodEnd,
                summary: data.summary
            };

        } catch (error) {
            console.error('Gemini Analysis Failed:', error);
            throw new Error('Failed to analyze bill. Please enter details manually.');
        }
    }
};

// Helper: Convert File to GoogleGenerativeAI Part
async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string } }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
            const base64Data = base64String.split(',')[1];
            resolve({
                inlineData: {
                    data: base64Data,
                    mimeType: file.type
                }
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
