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
    date: string // Format: 'YYYY-MM'
): Promise<number | null> {
    try {
        const { data, error } = await supabase
            .from('index_data')
            .select('value')
            .eq('index_type', type)
            .eq('date', date)
            .single();

        if (error) {
            console.error('Error fetching index value:', error);
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
    // Generate historical data from 1999 up to CURRENT MONTH only
    const now = new Date();
    const currentRealYear = now.getFullYear();
    const currentRealMonth = now.getMonth() + 1;

    console.log(`Seeding data from 1999 up to ${currentRealMonth}/${currentRealYear}...`);

    const seedData: IndexData[] = [];
    const minCpi = 70.0; // Approx CPI in 1999

    // Start date: Nov 1999
    let currentYear = 1999;
    let currentMonth = 11;
    let currentValue = minCpi;
    const endYear = currentRealYear;

    // Total steps roughly
    const totalMonths = (endYear - currentYear) * 12 + (currentRealMonth - currentMonth);
    // Adjusted maxCpi based on time passed to keep realistic scale (approx 110-112 today)
    const targetCpiNow = 112.0;
    const avgIncrement = (targetCpiNow - minCpi) / (Math.max(1, totalMonths));

    while (currentYear < endYear || (currentYear === endYear && currentMonth <= currentRealMonth)) {
        const monthStr = currentMonth.toString().padStart(2, '0');
        const dateStr = `${currentYear}-${monthStr}`;

        // Add some random simulated fluctuation around the average increment
        const fluctuation = (Math.random() * 0.4 - 0.1); // -0.1 to +0.3
        currentValue += avgIncrement + (fluctuation * 0.1); // Dampened fluctuation

        seedData.push({
            index_type: 'cpi',
            date: dateStr,
            value: Number(currentValue.toFixed(2)),
            source: 'manual'
        });

        currentMonth++;
        if (currentMonth > 12) {
            currentMonth = 1;
            currentYear++;
        }
    }

    // Explicitly set some known recent values for accuracy (approximate) if desired
    // For now, the simulated smooth curve is sufficient for testing logic.

    console.log(`Generated ${seedData.length} historical index records.`);

    const { error } = await supabase
        .from('index_data')
        .upsert(seedData, { onConflict: 'index_type,date' });

    if (error) {
        console.error('Seeding failed:', error);
        throw error;
    }
    console.log('Seeding complete.');
}
