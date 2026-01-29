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
    async calculateLinkage(
        baseRent: number,
        baseIndex: number,
        currentIndex: number,
        baseDate: string,
        currentIndexDate: string,
        indexType: string = 'cpi',
        linkage_ceiling?: number | null,
        linkage_floor?: number | null
    ): Promise<number> {
        if (baseIndex === 0) return baseRent;

        // 1. Fetch linkage bases
        const bases = await this.getIndexBases(indexType);

        let chainFactor = 1.0;
        const bDate = new Date(baseDate);
        const cDate = new Date(currentIndexDate);

        bases.forEach(base => {
            const baseStart = new Date(base.base_period_start);
            if (baseStart > bDate && baseStart <= cDate) {
                if (base.chain_factor && base.chain_factor > 0) {
                    chainFactor *= parseFloat(base.chain_factor);
                }
            }
        });

        // Current ratio
        let ratio = (currentIndex * chainFactor) / baseIndex;

        // Apply Annualized Ceiling
        if (linkage_ceiling !== undefined && linkage_ceiling !== null && linkage_ceiling > 0) {
            const diffTime = Math.max(0, cDate.getTime() - bDate.getTime());
            const diffDays = diffTime / (1000 * 60 * 60 * 24);
            const years = diffDays / 365.25;

            const cumulativeCeilingPercent = linkage_ceiling * years;
            const maxRatio = 1 + (cumulativeCeilingPercent / 100);

            ratio = Math.min(ratio, maxRatio);
        }

        // Apply Floor (if set to 0, it means "don't drop below base index")
        if (linkage_floor === 0) {
            ratio = Math.max(ratio, 1);
        }

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
