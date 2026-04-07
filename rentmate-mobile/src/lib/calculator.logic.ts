/**
 * Pure calculation functions for RentMate indices.
 * Extracting this to a separate file allows for headless unit testing
 * of strict financial computations without UI/React dependencies.
 */

export interface SingleCalcParams {
    bIndex: number;
    cIndex: number;
    baseRent: number;
    baseDate?: Date;
    targetDate?: Date;
    ceilingPercentage?: number; // e.g. 5 for 5%
    indexBaseMinimum?: boolean; // if true, rent never drops below base
}

export interface SingleCalcResult {
    newRent: number;
    diff: number;
    ratioUsed: number;
}

export function calculateSinglePayment(params: SingleCalcParams): SingleCalcResult {
    let rawRatio = (params.cIndex / params.bIndex) - 1;

    if (params.ceilingPercentage !== undefined && params.ceilingPercentage > 0) {
        let maxRatio = params.ceilingPercentage / 100;
        
        if (params.baseDate && params.targetDate) {
            const monthsPassed = (params.targetDate.getFullYear() - params.baseDate.getFullYear()) * 12 + 
                                 (params.targetDate.getMonth() - params.baseDate.getMonth());
            const yearsPassed = Math.max(0, Math.floor(monthsPassed / 12));
            maxRatio = (yearsPassed + 1) * (params.ceilingPercentage / 100);
        }

        if (rawRatio > maxRatio) {
            rawRatio = maxRatio;
        }
    }

    if (params.indexBaseMinimum && rawRatio < 0) {
        rawRatio = 0;
    }

    const newRent = params.baseRent * (1 + rawRatio);
    return {
        newRent,
        diff: newRent - params.baseRent,
        ratioUsed: rawRatio
    };
}

export interface PaymentItem {
    month: string;
    paid: number;
    targetIndex: number;
}

export interface SeriesCalcParams {
    baseRent: number;
    bIndex: number;
    payments: PaymentItem[];
    indexBaseMinimum?: boolean;
}

export interface SeriesCalcBreakdown extends PaymentItem {
    shouldPay: number;
    owed: number;
    ratioUsed: number;
}

export interface SeriesCalcResult {
    totalBackPay: number;
    breakdown: SeriesCalcBreakdown[];
}

export function calculateSeriesPayments(params: SeriesCalcParams): SeriesCalcResult {
    let totalOwed = 0;
    const breakdown: SeriesCalcBreakdown[] = [];

    const useMinimum = params.indexBaseMinimum ?? true;

    for (const p of params.payments) {
        let ratio = (p.targetIndex / params.bIndex) - 1;
        
        if (useMinimum && ratio < 0) {
            ratio = 0; 
        }

        const shouldPay = params.baseRent * (1 + ratio);
        const owed = shouldPay - p.paid;
        totalOwed += owed;

        breakdown.push({
            ...p,
            shouldPay,
            owed,
            ratioUsed: ratio
        });
    }

    return {
        totalBackPay: totalOwed,
        breakdown
    };
}
