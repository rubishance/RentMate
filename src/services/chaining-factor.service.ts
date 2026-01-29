import { supabase } from '../lib/supabase';

export interface ChainingFactor {
    id: string;
    index_type: 'cpi' | 'housing' | 'construction';
    from_base: string;
    to_base: string;
    factor: number;
    effective_date: string;
}

export interface ChainingResult {
    needsChaining: boolean;
    factor: number;
    fromBase: string;
    toBase: string;
}

/**
 * Service for managing CBS base year transitions and chaining factors (מקדם מקשר).
 * When the Central Bureau of Statistics changes the base year for an index,
 * a chaining factor must be applied to convert values between different bases.
 */
export class ChainingFactorService {
    private static cache: Map<string, ChainingFactor[]> = new Map();
    private static cacheExpiry: number = 0;
    private static CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

    /**
     * Determines the base year from a date string.
     * CBS typically uses the year itself as the base identifier.
     */
    private static getBaseYear(date: string): string {
        const year = new Date(date).getFullYear();

        // Known CBS base transitions
        if (year >= 2024) return '2024';
        if (year >= 2020) return '2020';
        if (year >= 2018) return '2018';
        if (year >= 2012) return '2012';

        return '2012'; // Fallback to oldest tracked base
    }

    /**
     * Fetches chaining factors from the database with caching.
     */
    private static async getChainingFactors(indexType: 'cpi' | 'housing' | 'construction'): Promise<ChainingFactor[]> {
        const now = Date.now();
        const cacheKey = indexType;

        // Return cached data if valid
        if (this.cache.has(cacheKey) && now < this.cacheExpiry) {
            return this.cache.get(cacheKey)!;
        }

        // Fetch from database
        const { data, error } = await supabase
            .from('chaining_factors')
            .select('*')
            .eq('index_type', indexType)
            .order('effective_date', { ascending: false });

        if (error) {
            console.error('Error fetching chaining factors:', error);
            return [];
        }

        // Update cache
        this.cache.set(cacheKey, data || []);
        this.cacheExpiry = now + this.CACHE_TTL;

        return data || [];
    }

    /**
     * Determines if chaining is needed and returns the appropriate factor.
     * 
     * @param indexType - The type of index (cpi, housing, construction)
     * @param baseDate - The base index date from the contract
     * @param targetDate - The target date for calculation
     * @returns ChainingResult with factor information
     */
    static async getChainingFactor(
        indexType: 'cpi' | 'housing' | 'construction',
        baseDate: string,
        targetDate: string
    ): Promise<ChainingResult> {
        const baseYear = this.getBaseYear(baseDate);
        const targetYear = this.getBaseYear(targetDate);

        // No chaining needed if same base
        if (baseYear === targetYear) {
            return {
                needsChaining: false,
                factor: 1.0,
                fromBase: baseYear,
                toBase: targetYear
            };
        }

        // Fetch chaining factors
        const factors = await this.getChainingFactors(indexType);

        // Find the appropriate chaining factor
        const chainingFactor = factors.find(
            f => f.from_base === baseYear && f.to_base === targetYear
        );

        if (!chainingFactor) {
            console.warn(`No chaining factor found for ${indexType} from ${baseYear} to ${targetYear}`);
            return {
                needsChaining: true,
                factor: 1.0, // Fallback to no adjustment
                fromBase: baseYear,
                toBase: targetYear
            };
        }

        return {
            needsChaining: true,
            factor: chainingFactor.factor,
            fromBase: baseYear,
            toBase: targetYear
        };
    }

    /**
     * Applies the chaining factor to a target index value.
     * Formula: Adjusted Target = Target Index * Chaining Factor
     */
    static applyChaining(targetValue: number, chainingResult: ChainingResult): number {
        if (!chainingResult.needsChaining) {
            return targetValue;
        }

        return targetValue * chainingResult.factor;
    }

    /**
     * Clears the cache (useful for testing or manual refresh).
     */
    static clearCache(): void {
        this.cache.clear();
        this.cacheExpiry = 0;
    }
}
