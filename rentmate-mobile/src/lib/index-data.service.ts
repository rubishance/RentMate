import { supabase } from './supabase';

type LinkageType = 'cpi' | 'housing';
type LinkageSubType = 'known' | 'respect_of';

export interface IndexData {
    index_type: LinkageType;
    date: string;
    value: number;
    source: string;
    actual_published_at?: string;
}

/**
 * Get the exact Known Index safely resolving actual_published_at if available in the database.
 */
export async function getKnownIndexForDate(
    type: LinkageType,
    targetDate: string, // YYYY-MM
    linkageSubType: LinkageSubType
): Promise<IndexData | null> {
    try {
        if (linkageSubType === 'respect_of') {
            const { data } = await supabase
                .from('index_data')
                .select('*')
                .eq('index_type', type)
                .eq('date', targetDate)
                .maybeSingle();
            return data as IndexData | null;
        }

        // linkageSubType === 'known'
        // 1. Try finding dynamically published index 
        const exactLimit = `${targetDate}-01T23:59:59.999Z`;
        const { data: exactMatch } = await supabase
            .from('index_data')
            .select('*')
            .eq('index_type', type)
            .not('actual_published_at', 'is', null)
            .lte('actual_published_at', exactLimit)
            .order('date', { ascending: false })
            .limit(1)
            .maybeSingle();
            
        if (exactMatch) return exactMatch as IndexData;

        // 2. Fallback to Israeli Law approximation (Day 15 rule)
        // Since we only get YYYY-MM from the user in Mobile (no Day), 
        // we assume rent starts on the 1st of the month.
        // Therefore, on the 1st of the month, the 'known' index is the index from 2 months prior.
        // E.g., Jan 1st -> known index is November's index (published Dec 15th).
        let currentYear = parseInt(targetDate.slice(0, 4), 10);
        let currentMonth = parseInt(targetDate.slice(5, 7), 10);

        // Subtract 2 months
        currentMonth -= 2;
        if (currentMonth <= 0) {
            currentMonth += 12;
            currentYear -= 1;
        }

        const fallbackMonth = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;

        const { data: fallbackMatch } = await supabase
            .from('index_data')
            .select('*')
            .eq('index_type', type)
            .lte('date', fallbackMonth)
            .order('date', { ascending: false })
            .limit(1)
            .maybeSingle();
            
        return fallbackMatch as IndexData | null;
    } catch(e) {
        console.error(e);
        return null;
    }
}
