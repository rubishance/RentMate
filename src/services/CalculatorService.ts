import { supabase } from '../lib/supabase';
import type { IndexData } from '../types/database';

export class CalculatorService {
    private static instance: CalculatorService;

    private constructor() { }

    public static getInstance(): CalculatorService {
        if (!CalculatorService.instance) {
            CalculatorService.instance = new CalculatorService();
        }
        return CalculatorService.instance;
    }

    /**
     * Fetches the index value for a specific type and month.
     * @param indexType 'cpi', 'housing', 'construction', 'usd', 'eur'
     * @param date 'YYYY-MM'
     */
    async getIndexValue(indexType: string, date: string): Promise<number | null> {
        // Try to match exact date
        const { data, error } = await supabase
            .from('index_data')
            .select('value')
            .eq('index_type', indexType)
            .eq('date', date)
            .single();

        if (error) {
            console.warn(`CalculatorService: Error fetching index ${indexType} for ${date}`, error);
            return null;
        }

        return data?.value || null;
    }

    /**
     * Fetches a range of index values for charting or analysis.
     */
    async getIndexHistory(indexType: string, startDate: string, endDate: string): Promise<IndexData[]> {
        const { data, error } = await supabase
            .from('index_data')
            .select('*')
            .eq('index_type', indexType)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true });

        if (error) {
            console.error('CalculatorService: Error fetching history', error);
            return [];
        }

        return data as IndexData[];
    }

    async getIndexBases(indexType: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('index_bases')
            .select('*')
            .eq('index_type', indexType)
            .order('base_period_start', { ascending: false });

        if (error) {
            console.error('CalculatorService: Error fetching index bases', error);
            return [];
        }
        return data || [];
    }

    /**
     * Calculates the new rent based on linkage, supporting CHAINED INDICES.
     * Formula: Rent * (CurrentIndex / BaseIndex) * ChainFactors...
     */
    async calculateLinkage(baseRent: number, baseIndex: number, currentIndex: number, baseDate: string, currentIndexDate: string, indexType: string = 'cpi'): Promise<number> {
        if (baseIndex === 0) return baseRent;

        // 1. Fetch linkage bases
        const bases = await this.getIndexBases(indexType);

        // 2. Identify if we crossed any base periods
        // Logic: Find all bases that started AFTER the baseDate and BEFORE or ON the currentIndexDate

        let chainFactor = 1.0;

        // Example: 
        // Base Date: 2018-05 (Base 2016)
        // Current Date: 2024-05 (Base 2022)
        // We crossed:
        // - Base 2022 (Starts 2023-01) -> Factor to 2020: F1
        // - Base 2020 (Starts 2021-01) -> Factor to 2018: F2
        // - Base 2018 (Starts 2019-01) -> Factor to 2016: F3
        // Total Factor = F1 * F2 * F3

        // Simple implementation:
        // Sort bases descending.
        // Iterate. If base.start_date > baseDate AND base.start_date <= currentIndexDate (approx), apply factor.

        const bDate = new Date(baseDate);
        const cDate = new Date(currentIndexDate);

        bases.forEach(base => {
            const baseStart = new Date(base.base_period_start);
            // If this base period started AFTER the contract base date
            // AND the contract *reaches* into or past this base period
            if (baseStart > bDate && baseStart <= cDate) {
                if (base.chain_factor && base.chain_factor > 0) {
                    chainFactor *= parseFloat(base.chain_factor);
                }
            }
        });

        // CBS Formula for Chained:
        // (Current Index * Chain Factor / Base Index) * Base Rent
        // Note: This assumes Base Index is from the Original Base Period.

        const ratio = (currentIndex * chainFactor) / baseIndex;
        return Math.round(baseRent * ratio);
    }

    /**
     * Helper to get the previous month in 'YYYY-MM' format (commonly used for known indices).
     * e.g. In May (05), the known index is usually from April (04) or March (03).
     */
    getPreviousKnownMonth(): string {
        const date = new Date();
        date.setMonth(date.getMonth() - 1); // Previous month (often latest published)
        // If today is early in the month (e.g. 1st-15th), might need date.setMonth(date.getMonth() - 2);
        // keeping it simple for now: previous month.
        return date.toISOString().slice(0, 7); // 'YYYY-MM'
    }
}

export const calculatorService = CalculatorService.getInstance();
