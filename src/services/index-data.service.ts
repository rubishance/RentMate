import { supabase } from '../lib/supabase';
import type { IndexData } from '../types/database';

/**
 * Service for fetching index data from Supabase
 * Data is pre-populated by server-side Edge Function
 */

/**
 * Get a single index value for a specific type and date
 */
export async function getIndexValue(
    type: 'cpi' | 'housing' | 'construction' | 'usd' | 'eur',
    date: string // Format: 'YYYY-MM' or 'YYYY-MM-DD'
): Promise<number | null> {
    try {
        // Normalize date based on index type
        let lookupDate = date;
        if (['cpi', 'housing', 'construction'].includes(type) && date.length > 7) {
            lookupDate = date.slice(0, 7);
        }

        const { data, error } = await supabase
            .from('index_data')
            .select('value')
            .eq('index_type', type)
            .eq('date', lookupDate)
            .single();

        if (error) {
            // If full date check fails for currencies, try the month? 
            // Better to just log and return null for now as currencies should have precise dates.
            console.error(`Error fetching index value for ${type} at ${lookupDate}:`, error);
            return null;
        }

        return data?.value || null;
    } catch (error) {
        console.error('Error in getIndexValue:', error);
        return null;
    }
}

/**
 * Get index values for a date range
 * Useful for payment reconciliation
 */
export async function getIndexRange(
    type: 'cpi' | 'housing' | 'construction' | 'usd' | 'eur',
    startDate: string, // Format: 'YYYY-MM'
    endDate: string // Format: 'YYYY-MM'
): Promise<IndexData[]> {
    try {
        const { data, error } = await supabase
            .from('index_data')
            .select('*')
            .eq('index_type', type)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true });

        if (error) {
            console.error('Error fetching index range:', error);
            return [];
        }

        return (data as IndexData[]) || [];
    } catch (error) {
        console.error('Error in getIndexRange:', error);
        return [];
    }
}

/**
 * Get the latest available index value for a type
 */
export async function getLatestIndex(
    type: 'cpi' | 'housing' | 'construction' | 'usd' | 'eur'
): Promise<IndexData | null> {
    try {
        const { data, error } = await supabase
            .from('index_data')
            .select('*')
            .eq('index_type', type)
            .order('date', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            console.error('Error fetching latest index:', error);
            return null;
        }

        return data as IndexData;
    } catch (error) {
        console.error('Error in getLatestIndex:', error);
        return null;
    }
}

/**
 * Generate array of months between two dates
 * Helper function for payment reconciliation
 */
export function getMonthsBetween(startDate: string, endDate: string): string[] {
    const months: string[] = [];
    const start = new Date(startDate + '-01');
    const end = new Date(endDate + '-01');

    let current = new Date(start);
    while (current <= end) {
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        months.push(`${year}-${month}`);
        current.setMonth(current.getMonth() + 1);
    }

    return months;
}
/**
 * Get the min and max dates available for a specific index type
 */
export async function getAvailableRange(
    type: 'cpi' | 'housing' | 'construction' | 'usd' | 'eur'
): Promise<{ min: string | null; max: string | null }> {
    try {
        const { data, error } = await supabase
            .from('index_data')
            .select('date')
            .eq('index_type', type)
            .order('date', { ascending: true });

        if (error || !data || data.length === 0) {
            return { min: null, max: null };
        }

        return {
            min: data[0].date,
            max: data[data.length - 1].date
        };
    } catch (error) {
        console.error('Error fetching range:', error);
        return { min: null, max: null };
    }
}

/**
 * Seed specific index data (Client-side fallback)
 * populates 2024-2025 with sample/real data for development/testing
 */
export async function seedIndexData() {
    const now = new Date();
    const currentRealYear = now.getFullYear();
    const currentRealMonth = now.getMonth() + 1;

    console.log(`Seeding all index types up to ${currentRealMonth}/${currentRealYear}...`);

    const indexTypes = [
        { type: 'cpi', startVal: 70.0, targetVal: 112.0 },
        { type: 'housing', startVal: 65.0, targetVal: 125.0 },
        { type: 'construction', startVal: 60.0, targetVal: 130.0 },
        { type: 'usd', startVal: 4.2, targetVal: 3.7 },
        { type: 'eur', startVal: 4.5, targetVal: 4.0 }
    ];

    for (const { type, startVal, targetVal } of indexTypes) {
        const seedData: IndexData[] = [];
        let currentYear = 1999;
        let currentMonth = 1;
        let currentValue = startVal;
        const endYear = currentRealYear;

        const totalMonths = (endYear - currentYear) * 12 + (currentRealMonth - currentMonth);
        const avgIncrement = (targetVal - startVal) / (Math.max(1, totalMonths));

        while (currentYear < endYear || (currentYear === endYear && currentMonth <= currentRealMonth)) {
            const monthStr = currentMonth.toString().padStart(2, '0');
            const dateStr = `${currentYear}-${monthStr}`;

            const fluctuation = (Math.random() * 0.4 - 0.2);
            currentValue += avgIncrement + (fluctuation * (type === 'usd' || type === 'eur' ? 0.05 : 0.1));

            seedData.push({
                index_type: type as any,
                date: dateStr,
                value: Number(currentValue.toFixed(4)),
                source: 'manual'
            });

            currentMonth++;
            if (currentMonth > 12) {
                currentMonth = 1;
                currentYear++;
            }
        }

        console.log(`Upserting ${seedData.length} records for ${type}...`);
        const { error } = await supabase
            .from('index_data')
            .upsert(seedData, { onConflict: 'index_type,date' });

        if (error) {
            console.error(`Seeding failed for ${type}:`, error);
        }
    }
    console.log('Seeding complete for all indices.');
}

/**
 * Get index bases for chaining calculations
 */
export async function getIndexBases(
    type: 'cpi' | 'housing' | 'construction' | 'usd' | 'eur'
): Promise<any[]> {
    try {
        const { data, error } = await supabase
            .from('index_bases')
            .select('*')
            .eq('index_type', type)
            .order('base_period_start', { ascending: false });

        if (error) {
            console.error('Error fetching index bases:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error in getIndexBases:', error);
        return [];
    }
}
