import type {
    StandardCalculationInput,
    StandardCalculationResult,
    ReconciliationInput,
    ReconciliationResult,
    MonthlyPayment
} from '../types/database';
import { getIndexValue, getIndexRange, getMonthsBetween, getAvailableRange } from './index-data.service';

/**
 * Calculator Service
 * Implements two calculation modes:
 * 1. Standard: Calculate updated rent based on index change
/**
 * Mode 1: Standard Calculation
 * Calculate new rent based on index change between two dates
 */
export async function calculateStandard(
    input: StandardCalculationInput
): Promise<StandardCalculationResult | null> {
    try {
        // Fetch index values (or use manual overrides)
        const baseIndexValue = input.manualBaseIndex ?? await getIndexValue(input.linkageType, input.baseDate);
        const targetIndexValue = input.manualTargetIndex ?? await getIndexValue(input.linkageType, input.targetDate);

        if (baseIndexValue === null || targetIndexValue === null) {
            console.error('Missing index data for calculation');
            return null;
        }

        // Calculate מקדם קישור (linkage coefficient)
        const linkageCoefficient = ((targetIndexValue / baseIndexValue) - 1) * 100;

        // Apply partial linkage if specified
        const partialLinkage = input.partialLinkage ?? 100;
        let effectiveChange = (linkageCoefficient / 100) * (partialLinkage / 100);

        // Apply index floor if specified (base index is minimum)
        if (input.isIndexBaseMinimum && effectiveChange < 0) {
            effectiveChange = 0; // Prevent rent from dropping below base
        }

        // Calculate new rent
        const newRent = input.baseRent * (1 + effectiveChange);

        // Calculate changes
        const absoluteChange = newRent - input.baseRent;
        const percentageChange = (absoluteChange / input.baseRent) * 100;

        // Generate formula string
        const formula = partialLinkage === 100
            ? `New Rent = ₪${input.baseRent.toLocaleString()} × (${targetIndexValue} / ${baseIndexValue}) = ₪${Math.round(newRent).toLocaleString()}`
            : `New Rent = ₪${input.baseRent.toLocaleString()} × (1 + (${linkageCoefficient.toFixed(2)}% × ${partialLinkage}%)) = ₪${Math.round(newRent).toLocaleString()}`;

        const indexSource = input.manualBaseIndex
            ? 'Manual Entry'
            : `${input.linkageType.toUpperCase()} Index`;

        return {
            newRent: Math.round(newRent),
            baseIndexValue,
            targetIndexValue,
            linkageCoefficient,
            percentageChange,
            absoluteChange,
            formula,
            indexSource
        };
    } catch (error) {
        console.error('Error in calculateStandard:', error);
        return null;
    }
}

/**
 * Mode 2: Payment Reconciliation
 * Calculate difference between actual payments and index-adjusted payments
 */
export async function calculateReconciliation(
    input: ReconciliationInput
): Promise<ReconciliationResult | null> {
    // Get all months in the payment period
    const months = getMonthsBetween(input.periodStart, input.periodEnd);

    // Fetch index values for all months
    const indices = await getIndexRange(
        input.linkageType,
        input.contractStartDate,
        input.periodEnd
    );

    if (indices.length === 0) {
        // Should we try to fetch slightly wider range just in case?
        // For now, if truly empty, we can't do much.
        // But maybe the user just has NO data in DB?
        const { min, max } = await getAvailableRange(input.linkageType);
        if (!min) throw new Error('No index data available in the database. Please populate the index table with real data.');
    }


    // Get base index (from contract start date)
    // Try to find exact match, or closest PREVIOUS match (known index behavior)
    let baseIndex = indices.find(idx => idx.date === input.contractStartDate);

    if (!baseIndex) {
        // Fallback: Check if we have ANY data before start date to use as base
        const previousIndices = indices.filter(idx => idx.date <= input.contractStartDate);
        if (previousIndices.length > 0) {
            baseIndex = previousIndices[previousIndices.length - 1]; // Last known
        } else {
            // We can't proceed without a base
            throw new Error(`Base index not found for date: ${input.contractStartDate}. Please ensure historical index data exists.`);
        }
    }

    const monthlyBreakdown: MonthlyPayment[] = [];
    let totalBackPayOwed = 0;

    // Calculate for each month
    let lastCalculatedRent = input.baseRent;
    const frequencyMonths = input.updateFrequency === 'quarterly' ? 3
        : input.updateFrequency === 'semiannually' ? 6
            : input.updateFrequency === 'annually' ? 12 : 1;

    for (let i = 0; i < months.length; i++) {
        const month = months[i];

        // Determine which index date to use based on sub-type
        // Default "Known": Index of previous month (usually known by payment date)
        // "Respect Of": Index of current month
        let indexDateStr = month;
        if (input.linkageSubType !== 'respect_of') { // Default to 'known'
            const mDate = new Date(month + '-01');
            mDate.setMonth(mDate.getMonth() - 1); // Previous month
            indexDateStr = mDate.toISOString().slice(0, 7);
        }

        const indexForMonth = indices.find(idx => idx.date === indexDateStr);
        let usedIndexValue = indexForMonth?.value;
        let isEstimated = false;

        if (!usedIndexValue) {
            // Find last available index that is BEFORE this required date
            const pastIndices = indices.filter(idx => idx.date < indexDateStr);
            if (pastIndices.length > 0) {
                usedIndexValue = pastIndices[pastIndices.length - 1].value;
                isEstimated = true;
            } else {
                // If we have absolutely no index data before this point, calculate with base index (0% change)
                usedIndexValue = baseIndex.value;
                isEstimated = true;
            }
        }

        let currentRent = lastCalculatedRent;

        // Check if we should update rent this month
        if (i % frequencyMonths === 0) {
            // Calculate מקדם קישור for this month vs Base
            const linkageCoefficient = ((usedIndexValue / baseIndex.value) - 1) * 100;

            // Apply partial linkage
            const partialLinkage = input.partialLinkage ?? 100;
            let effectiveChange = (linkageCoefficient / 100) * (partialLinkage / 100);

            // Apply Caps and Floors (Min/Max Percentage)
            if (input.isIndexBaseMinimum) {
                // If checked, indexation cannot result in a decrease below base (floor of 0%)
                effectiveChange = Math.max(effectiveChange, 0);
            }

            if (input.maxIncreasePercentage !== undefined && input.maxIncreasePercentage > 0) {
                effectiveChange = Math.min(effectiveChange, input.maxIncreasePercentage / 100);
            }

            // Note: If no min floor and negative index, effectiveChange can be negative (rent decrease)

            // Calculate updated rent
            const monthBase = input.monthlyBaseRent?.[month] ?? input.baseRent;
            currentRent = monthBase * (1 + effectiveChange);
            lastCalculatedRent = currentRent;
        }

        // Handle monthly base override
        const monthBase = input.monthlyBaseRent?.[month];
        if (monthBase !== undefined) {
            // Re-calculate based on this new base, applying current linkage to it
            const linkageCoefficient = ((usedIndexValue / baseIndex.value) - 1) * 100;
            const partialLinkage = input.partialLinkage ?? 100;
            let effectiveChange = (linkageCoefficient / 100) * (partialLinkage / 100);

            if (input.maxIncreasePercentage !== undefined) effectiveChange = Math.min(effectiveChange, input.maxIncreasePercentage / 100);

            currentRent = monthBase * (1 + effectiveChange);
            lastCalculatedRent = currentRent;
        }

        const shouldHavePaid = currentRent;

        // Determine actual paid for this specific month
        let actuallyPaid = 0;
        if (input.monthlyActuals) {
            // Smart Mode: Look up specific month
            actuallyPaid = input.monthlyActuals[month] || 0;
        } else {
            // Manual Mode: Use static average
            actuallyPaid = input.actualPaidPerMonth || 0;
        }

        // Calculate difference
        const difference = shouldHavePaid - actuallyPaid;
        totalBackPayOwed += difference;

        monthlyBreakdown.push({
            month,
            shouldHavePaid: Math.round(shouldHavePaid),
            actuallyPaid: actuallyPaid,
            difference: Math.round(difference),
            indexValue: usedIndexValue || 0,
            linkageCoefficient: 0 // logic simplified
        });
    }

    const totalMonths = monthlyBreakdown.length;
    const averageUnderpayment = totalBackPayOwed / totalMonths;
    const totalPaid = monthlyBreakdown.reduce((sum, item) => sum + item.actuallyPaid, 0);
    const percentageOwed = totalPaid > 0 ? (totalBackPayOwed / totalPaid) * 100 : 0;

    return {
        totalBackPayOwed: Math.round(totalBackPayOwed),
        averageUnderpayment: Math.round(averageUnderpayment),
        percentageOwed,
        monthlyBreakdown,
        totalMonths
    };
}
