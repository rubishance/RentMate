import type {
    StandardCalculationInput,
    StandardCalculationResult,
    ReconciliationInput,
    ReconciliationResult,
    MonthlyPayment,
} from '../types/database';
import { getIndexValue, getIndexRange, getMonthsBetween, getKnownIndexForDate } from './index-data.service';
import type { IndexData } from '../types/database';
import { ChainingFactorService } from './chaining-factor.service';
import { subMonths, format, parseISO, differenceInDays } from 'date-fns';
import { z } from 'zod';

/**
 * Validation Schemas
 */
export const standardCalculationSchema = z.object({
    baseRent: z.number().positive(),
    linkageType: z.enum(['cpi', 'housing', 'construction', 'usd', 'eur']),
    baseDate: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/),
    targetDate: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/),
    partialLinkage: z.number().min(0).max(100).optional().default(100),
    manualBaseIndex: z.number().nullable().optional(),
    manualTargetIndex: z.number().nullable().optional(),
    isIndexBaseMinimum: z.boolean().optional().default(false),
    linkageCeiling: z.number().min(0).nullable().optional(),
    linkageSubType: z.enum(['known', 'respect_of']).optional().default('known'),
});

/**
 * Pure Logic: Calculate Prorated Ceiling
 */
export function calculateProratedCeiling(annualCeiling: number, startDate: string, endDate: string): number {
    const start = parseISO(startDate + '-01');
    const end = parseISO(endDate + '-01');
    const days = Math.max(0, differenceInDays(end, start));
    const years = days / 365.25;
    return (annualCeiling / 100) * years;
}

/**
 * Pure Logic: Calculate Effective Change
 */
export function calculateEffectiveChange(params: {
    linkageCoefficient: number;
    partialLinkage: number;
    isIndexBaseMinimum: boolean;
    proratedCeiling?: number;
}): number {
    let effectiveChange = (params.linkageCoefficient / 100) * (params.partialLinkage / 100);

    if (params.proratedCeiling !== undefined) {
        effectiveChange = Math.min(effectiveChange, params.proratedCeiling);
    }

    if (params.isIndexBaseMinimum && effectiveChange < 0) {
        effectiveChange = 0;
    }

    return effectiveChange;
}

/**
 * Pure Logic: Find precise index in-memory (For Reconciliation engine looping)
 */
export function findKnownIndexStrict(
    indices: IndexData[], 
    targetPaymentDate: string, // YYYY-MM-DD
    linkageSubType: 'known' | 'respect_of'
): IndexData | null {
    if (linkageSubType === 'respect_of') {
        const monthOnly = targetPaymentDate.slice(0, 7);
        return indices.find(idx => idx.date === monthOnly) || null;
    }

    // linkageSubType === 'known'
    const sortedDesc = [...indices].sort((a, b) => b.date.localeCompare(a.date));

    // 1. Try finding by actual_published_at
    const exactLimit = `${targetPaymentDate}T23:59:59.999Z`;
    const exactMatch = sortedDesc.find(idx => 
        idx.actual_published_at && idx.actual_published_at <= exactLimit
    );
    if (exactMatch) return exactMatch;

    // 2. Fallback to Israeli Law approximation (Day 15 rule)
    const dateObj = parseISO(targetPaymentDate.length === 7 ? `${targetPaymentDate}-01` : targetPaymentDate);
    const day = dateObj.getDate();
    const fallbackMonth = day < 15 
        ? format(subMonths(dateObj, 2), 'yyyy-MM')
        : format(subMonths(dateObj, 1), 'yyyy-MM');

    return sortedDesc.find(idx => idx.date <= fallbackMonth) || null;
}

/**
 * Mode 1: Standard Calculation
 * Calculate new rent based on index change between two dates
 */
export async function calculateStandard(
    rawInput: StandardCalculationInput
): Promise<StandardCalculationResult | null> {
    try {
        const input = standardCalculationSchema.parse(rawInput);

        // Fetch index values precisely utilizing exact publication timestamps from DB
        let baseIndexValue = input.manualBaseIndex ?? null;
        let targetIndexValue = input.manualTargetIndex ?? null;
        let adjustedBaseDate = input.baseDate;
        let adjustedTargetDate = input.targetDate;

        if (baseIndexValue === null) {
            const baseIndexData = await getKnownIndexForDate(input.linkageType, input.baseDate, input.linkageSubType || 'known');
            baseIndexValue = baseIndexData?.value ?? null;
            if (baseIndexData) adjustedBaseDate = baseIndexData.date;
        }

        let actualTargetDate = input.targetDate;
        if (targetIndexValue === null) {
            const targetIndexData = await getKnownIndexForDate(input.linkageType, input.targetDate, input.linkageSubType || 'known');
            targetIndexValue = targetIndexData?.value ?? null;
            if (targetIndexData) {
                adjustedTargetDate = targetIndexData.date;
                actualTargetDate = targetIndexData.date;
            }
        }

        // Fallback logic for target index: if not published yet, try up to 2 months prior
        if (targetIndexValue === null && !input.manualTargetIndex) {
            for (let i = 1; i <= 2; i++) {
                const fallbackDate = format(subMonths(parseISO(adjustedTargetDate + '-01'), i), 'yyyy-MM');
                const fallbackValue = await getIndexValue(input.linkageType, fallbackDate);
                if (fallbackValue !== null) {
                    targetIndexValue = fallbackValue;
                    actualTargetDate = fallbackDate;
                    break;
                }
            }
        }

        if (baseIndexValue === null || targetIndexValue === null) {
            throw new Error(`Missing index data for ${input.linkageType} at ${adjustedBaseDate} or ${adjustedTargetDate}`);
        }

        // Apply Chaining
        let adjustedTargetValue = targetIndexValue;
        const chainableTypes = ['cpi', 'housing', 'construction'] as const;
        const linkageType = input.linkageType as any;

        if (chainableTypes.includes(linkageType)) {
            const chainingResult = await ChainingFactorService.getChainingFactor(
                linkageType,
                adjustedBaseDate,
                actualTargetDate
            );
            adjustedTargetValue = ChainingFactorService.applyChaining(targetIndexValue, chainingResult);
        }

        // Calculate Linkage
        const rawRatio = adjustedTargetValue / baseIndexValue;
        const linkageCoefficient = (rawRatio - 1) * 100;

        const proratedCeiling = input.linkageCeiling
            ? calculateProratedCeiling(input.linkageCeiling, adjustedBaseDate, adjustedTargetDate)
            : undefined;

        const effectiveChange = calculateEffectiveChange({
            linkageCoefficient,
            partialLinkage: input.partialLinkage,
            isIndexBaseMinimum: input.isIndexBaseMinimum,
            proratedCeiling
        });

        const newRent = input.baseRent * (1 + effectiveChange);

        // Generate formula string
        const hasChaining = adjustedTargetValue !== targetIndexValue;
        let formula = '';
        if (input.partialLinkage === 100) {
            if (hasChaining) {
                const chainingFactor = adjustedTargetValue / targetIndexValue;
                formula = `New Rent = ₪${input.baseRent.toLocaleString()} × ((${targetIndexValue} × ${chainingFactor.toFixed(4)}) / ${baseIndexValue}) = ₪${Math.round(newRent).toLocaleString()}`;
            } else {
                formula = `New Rent = ₪${input.baseRent.toLocaleString()} × (${adjustedTargetValue} / ${baseIndexValue}) = ₪${Math.round(newRent).toLocaleString()}`;
            }
        } else {
            formula = `New Rent = ₪${input.baseRent.toLocaleString()} × (1 + (${linkageCoefficient.toFixed(2)}% × ${input.partialLinkage}%)) = ₪${Math.round(newRent).toLocaleString()}`;
        }

        return {
            newRent: Math.round(newRent),
            baseIndexValue,
            targetIndexValue: adjustedTargetValue,
            linkageCoefficient,
            percentageChange: effectiveChange * 100,
            absoluteChange: newRent - input.baseRent,
            formula,
            indexSource: input.manualBaseIndex ? 'Manual' : `${input.linkageType.toUpperCase()} Index`
        };
    } catch (error) {
        console.error('calculateStandard failed:', error);
        return null;
    }
}

/**
 * Mode 2: Payment Reconciliation
 */
export async function calculateReconciliation(
    input: ReconciliationInput
): Promise<ReconciliationResult | null> {
    try {
        const allMonths = getMonthsBetween(input.periodStart.slice(0, 7), input.periodEnd.slice(0, 7));
        const currentMonthStr = format(new Date(), 'yyyy-MM');

        // Filter out future months to avoid calculating for periods that haven't happened
        const months = allMonths.filter(m => m <= currentMonthStr);

        if (months.length === 0) {
            return {
                totalBackPayOwed: 0,
                monthlyBreakdown: [],
                totalMonths: 0
            };
        }

        // Update periodEnd based on the filtered months to avoid fetching future indices
        const effectivePeriodEnd = months[months.length - 1];

        // 1. Fetch indices with a generous buffer to account for Day 15 historical fallbacks
        let rawFetchStart = input.periodStart.slice(0, 7) < input.contractStartDate.slice(0, 7) 
            ? input.periodStart.slice(0, 7) 
            : input.contractStartDate.slice(0, 7);
            
        const safeFetchStart = format(subMonths(parseISO(rawFetchStart + '-01'), 2), 'yyyy-MM');
        const indices = await getIndexRange(input.linkageType, safeFetchStart, effectivePeriodEnd);

        if (indices.length === 0) throw new Error('No index data found');

        // 2. Safely pinpoint the theoretical Base Index with precise date math
        const baseIndex = findKnownIndexStrict(indices, input.contractStartDate, input.linkageSubType || 'known');
        if (!baseIndex) throw new Error(`Base index not found strictly before ${input.contractStartDate}`);

        const monthlyBreakdown: MonthlyPayment[] = [];
        let runningBalance = 0;
        let previousIndexValue = 0;
        let lastCalculatedBaseRent = input.baseRent;

        const frequencyMonths = input.updateFrequency === 'quarterly' ? 3
            : input.updateFrequency === 'semiannually' ? 6
                : input.updateFrequency === 'annually' ? 12 : 1;

        const inputDay = input.periodStart.length === 10 ? input.periodStart.slice(8, 10) : '01';

        for (let i = 0; i < months.length; i++) {
            const month = months[i];
            const fullDateStr = `${month}-${inputDay}`;
            const indexForMonth = findKnownIndexStrict(indices, fullDateStr, input.linkageSubType || 'known') || baseIndex;

            const currentIndexValue = indexForMonth.value;

            // Balance Revaluation
            let linkageChange = 0;
            if (i > 0) {
                const rawChange = (currentIndexValue / previousIndexValue) - 1;
                linkageChange = rawChange * ((input.partialLinkage ?? 100) / 100);
                runningBalance *= (1 + linkageChange);
            }

            previousIndexValue = currentIndexValue;

            // Monthly Rent Calculation
            let currentMonthRent = lastCalculatedBaseRent;
            if (input.monthlyBaseRent?.[month] !== undefined || i % frequencyMonths === 0) {
                const baseToUse = input.monthlyBaseRent?.[month] ?? input.baseRent;
                const rawRentRatio = (currentIndexValue / baseIndex.value) - 1;

                const proratedCeiling = input.maxIncreasePercentage
                    ? calculateProratedCeiling(input.maxIncreasePercentage, input.contractStartDate, month)
                    : undefined;

                const effectiveRentChange = calculateEffectiveChange({
                    linkageCoefficient: rawRentRatio * 100,
                    partialLinkage: input.partialLinkage ?? 100,
                    isIndexBaseMinimum: input.isIndexBaseMinimum ?? false,
                    proratedCeiling
                });

                currentMonthRent = baseToUse * (1 + effectiveRentChange);
                lastCalculatedBaseRent = currentMonthRent;
            }

            const actuallyPaid = input.monthlyActuals?.[month] ?? input.actualPaidPerMonth ?? 0;
            runningBalance += actuallyPaid - currentMonthRent;

            monthlyBreakdown.push({
                month,
                shouldHavePaid: Math.round(currentMonthRent),
                actuallyPaid,
                difference: Math.round(runningBalance),
                indexValue: currentIndexValue,
                linkageCoefficient: linkageChange * 100
            });
        }

        return {
            totalBackPayOwed: Math.round(-runningBalance),
            monthlyBreakdown,
            totalMonths: months.length
        };
    } catch (error) {
        console.error('calculateReconciliation failed:', error);
        throw error;
    }
}
