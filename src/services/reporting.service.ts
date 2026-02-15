
import { supabase } from '../lib/supabase';
import type { Property, PropertyDocument, Payment } from '../types/database';

export interface ReportData {
    property: Property;
    periodStart: string;
    periodEnd: string;
    payments: Payment[];
    utilities: PropertyDocument[];
    totals: {
        income: number;
        expenses: number;
        net: number;
    };
}

export const ReportService = {
    /**
     * Aggregates data for a specific property and time range
     * (Deprecated: Logic moved to Edge Function, but kept for legacy UI compatibility if needed)
     */
    async fetchReportData(propertyId: string, startDate: string, endDate: string): Promise<ReportData> {
        // 1. Fetch Property
        const { data: property } = await supabase
            .from('properties')
            .select('*')
            .eq('id', propertyId)
            .single();

        if (!property) throw new Error('Property not found');

        // 2. Fetch Payments in range
        const { data: payments } = await supabase
            .from('payments')
            .select('*')
            .eq('contract_id', (await supabase.from('contracts').select('id').eq('property_id', propertyId).limit(1).maybeSingle()).data?.id || '00000000-0000-0000-0000-000000000000')
            .gte('due_date', startDate)
            .lte('due_date', endDate);

        // 3. Fetch Utilities in range
        const { data: utilities } = await supabase
            .from('property_documents')
            .select('*')
            .eq('property_id', propertyId)
            .like('category', 'utility_%')
            .gte('document_date', startDate)
            .lte('document_date', endDate);

        const totalIncome = (payments || []).reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
        const totalExpenses = (utilities || []).reduce((sum, u) => sum + (u.amount || 0), 0);

        return {
            property,
            periodStart: startDate,
            periodEnd: endDate,
            payments: payments || [],
            utilities: utilities || [],
            totals: {
                income: totalIncome,
                expenses: totalExpenses,
                net: totalIncome - totalExpenses
            }
        };
    },

    /**
     * Generates a professional PDF report using Supabase Edge Function
     */
    async generatePDF(propertyId: string, startDate: string, endDate: string, lang: 'he' | 'en' = 'he'): Promise<void> {
        console.log('[ReportService] Generating report...', { propertyId, startDate, endDate, lang });

        try {
            const { data, error } = await supabase.functions.invoke('generate-report', {
                body: { propertyId, startDate, endDate, lang }
            });

            if (error) {
                console.error('[ReportService] Edge Function Error:', error);

                // Try to extract a useful message from the error object
                let errorMessage = 'Server failed to generate report';
                if (typeof error === 'object' && error !== null) {
                    errorMessage = (error as any).message || JSON.stringify(error);
                }
                throw new Error(errorMessage);
            }

            if (!data?.pdf) {
                console.error('[ReportService] Invalid response format:', data);
                throw new Error('Server returned invalid report data');
            }

            // Handle the data URI response
            const link = document.createElement('a');
            link.href = data.pdf;
            // Sanitize filename
            const dateStr = startDate.replace(/[-/]/g, '');
            link.download = `RentMate_Report_${propertyId.slice(0, 8)}_${dateStr}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log('[ReportService] Report generated successfully');
        } catch (err: any) {
            console.error('[ReportService] Generation Process Failed:', err);
            throw err;
        }
    }
};
