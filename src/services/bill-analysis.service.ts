
import { supabase } from '../lib/supabase';

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
    category: 'water' | 'electric' | 'gas' | 'municipality' | 'management' | 'internet' | 'cable' | 'other';
    amount: number;
    date: string; // YYYY-MM-DD
    vendor: string;
    invoiceNumber?: string;
    confidence: number;
    currency: string;
    billingPeriodStart?: string;
    billingPeriodEnd?: string;
    summary?: string;
    propertyId?: string | null;
    propertyAddress?: string | null;
}

export const BillAnalysisService = {
    /**
     * Checks if the user has remaining AI scans.
     * (Logic is now duplicated in Edge Function for safety, but kept here for UI pre-checks)
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
            return { allowed: true, currentUsage: 0, limit: -1 };
        }

        return data as { allowed: boolean; currentUsage: number; limit: number };
    },

    /**
     * Analyzes one or more files (images/PDFs) using server-side Edge Function.
     * @param files The file(s) to analyze.
     * @param properties Optional list of user properties for address matching.
     */
    async analyzeBill(files: File | File[], properties: { id: string, address: string }[] = []): Promise<ExtractedBillData> {
        const fileArray = Array.isArray(files) ? files : [files];

        try {
            // 1. Convert Files to Base64 (Edge Functions handle JSON payloads)
            const images = await Promise.all(fileArray.map(async (file) => {
                return new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            }));

            // 2. Invoke Edge Function
            const { data, error } = await supabase.functions.invoke('analyze-bill', {
                body: { images, properties }
            });

            if (error) {
                if ((error as any).limitExceeded) {
                    throw new UsageLimitExceededError(0, 0); // Simplified for UI
                }
                throw error;
            }

            if (!data) throw new Error('No data received from analysis service');

            // 3. Normalize Response
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
                summary: data.summary,
                propertyId: data.propertyId || null,
                propertyAddress: data.propertyAddress || null
            };

        } catch (error: any) {
            console.error('Bill Analysis Failed:', error);
            if (error instanceof UsageLimitExceededError) throw error;
            throw new Error(error.message || 'Failed to analyze bill. Please enter details manually.');
        }
    }
};
