import type {
    StandardCalculationInput,
    StandardCalculationResult,
    ReconciliationInput,
    ReconciliationResult,
    MonthlyPayment,
    IndexBase
} from '../types/database';
import { getIndexValue, getIndexRange, getMonthsBetween, getAvailableRange, getIndexBases } from './index-data.service';

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

        // Calculate Chaining Factor
        // -------------------------
        // We need to check if we crossed any index base periods.
        // Formula: NewIndex * ChainFactors / BaseIndex
        let chainFactor = 1.0;

        // Fetch bases only if not manual indices (manual implies specific known values)
        // Actually, even with manual indices, if the dates span bases, we might need chaining, 
        // but typically manual entry users handle that or it's a simple ratio.
        // We'll proceed assuming if it's auto-fetch, we check bases.
        if (!input.manualBaseIndex && !input.manualTargetIndex) {
            const bases = await getIndexBases(input.linkageType);

            // Sort bases descending (newest first)
            // Iterate to find bases that started AFTER baseDate and BEFORE/ON targetDate
            const bDate = new Date(input.baseDate + '-01'); // Ensure day is set
            const tDate = new Date(input.targetDate + '-01');

            bases.forEach((base: IndexBase) => {
                const baseStart = new Date(base.base_period_start);
                // logic: if a new base period started between baseDate and targetDate
                if (baseStart > bDate && baseStart <= tDate) {
                    if (base.chain_factor && base.chain_factor > 0) {
                        chainFactor *= Number(base.chain_factor);
                    }
                }
            });
        }

        // Calculate Linkage Ratio with Chain Factor
        // Ratio = (Target * Chain) / Base
        const rawRatio = (targetIndexValue * chainFactor) / baseIndexValue;

        // Calculate מקדם קישור (linkage coefficient) in percentage change
        // e.g. 1.05 -> 5%
        const linkageCoefficient = (rawRatio - 1) * 100;

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
        let formula = '';
        if (partialLinkage === 100) {
            if (chainFactor !== 1.0) {
                formula = `New Rent = ₪${input.baseRent.toLocaleString()} × ((${targetIndexValue} × ${chainFactor.toFixed(4)}) / ${baseIndexValue}) = ₪${Math.round(newRent).toLocaleString()}`;
            } else {
                formula = `New Rent = ₪${input.baseRent.toLocaleString()} × (${targetIndexValue} / ${baseIndexValue}) = ₪${Math.round(newRent).toLocaleString()}`;
            }
        } else {
            // Partial Linkage
            formula = `New Rent = ₪${input.baseRent.toLocaleString()} × (1 + (${linkageCoefficient.toFixed(2)}% × ${partialLinkage}%)) = ₪${Math.round(newRent).toLocaleString()}`;
        }

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
    // We need indices from BEFORE the start date to calculate the first revaluation if needed,
    // or at least from contract start.
    const indices = await getIndexRange(
        input.linkageType,
        input.contractStartDate,
        input.periodEnd
    );

    if (indices.length === 0) {
        const { min } = await getAvailableRange(input.linkageType);
        if (!min) throw new Error('No index data available in the database. Please populate the index table with real data.');
    }

    // Base Index (Start of Contract)
    let baseIndex = indices.find(idx => idx.date === input.contractStartDate);
    if (!baseIndex) {
        const previousIndices = indices.filter(idx => idx.date <= input.contractStartDate);
        if (previousIndices.length > 0) {
            baseIndex = previousIndices[previousIndices.length - 1];
        } else {
            throw new Error(`Base index not found for date: ${input.contractStartDate}.`);
        }
    }

    const monthlyBreakdown: MonthlyPayment[] = [];
    let runningBalance = 0;

    // Track the last used index value to calculate monthly revaluation
    // Initial state: No revaluation on the very first moment before any debt exists?
    // Actually, revaluation happens to the debt carried OVER.
    // For the loop, we need the index of month (i) and month (i-1).
    let previousIndexValue = 0;

    // Determine the "Previous Index" for the first iteration.
    // If we start at periodStart, the "balance" is 0, so revaluation doesn't matter for specific step 1.
    // BUT, we need to know the index for the RENT calculation immediately.

    const frequencyMonths = input.updateFrequency === 'quarterly' ? 3
        : input.updateFrequency === 'semiannually' ? 6
            : input.updateFrequency === 'annually' ? 12 : 1;

    let lastCalculatedBaseRent = input.baseRent;

    for (let i = 0; i < months.length; i++) {
        const month = months[i];

        // 1. Determine Index Value for this Month
        // ---------------------------------------
        let indexDateStr = month;
        if (input.linkageSubType !== 'respect_of') { // 'known'
            const mDate = new Date(month + '-01');
            mDate.setMonth(mDate.getMonth() - 1);
            indexDateStr = mDate.toISOString().slice(0, 7);
        }

        const indexForMonth = indices.find(idx => idx.date === indexDateStr);
        let currentIndexValue = indexForMonth?.value;

        // Fallback or Estimation
        if (!currentIndexValue) {
            const pastIndices = indices.filter(idx => idx.date < indexDateStr);
            if (pastIndices.length > 0) {
                currentIndexValue = pastIndices[pastIndices.length - 1].value;
            } else {
                currentIndexValue = baseIndex.value;
            }
        }

        // 2. Revalue Existing Balance (Linkage/Interest)
        // ----------------------------------------------
        let linkageChange = 0;
        let balanceRevaluation = 0;

        if (i > 0) {
            // Calculate change from previous month's index to current month's index
            // Formula: (Current / Prev) - 1
            const rawChange = (currentIndexValue / previousIndexValue) - 1;

            // Apply Partial Linkage to the CHANGE
            const partialLinkage = input.partialLinkage ?? 100;
            linkageChange = rawChange * (partialLinkage / 100);

            // Apply Revaluation to Running Balance
            // Note: If balance is negative (Debt), positive index increase makes it MORE negative (Higher Debt).
            // Logic: NewBalance = OldBalance * (1 + Change)
            // Example: Balance -5000. Index +1%. Change +0.01.
            // New = -5000 * 1.01 = -5050. Correct.

            balanceRevaluation = runningBalance * linkageChange;
            runningBalance += balanceRevaluation;
        }

        // Update tracker for next iteration
        previousIndexValue = currentIndexValue;

        // 3. Calculate New Monthly Rent (Charge)
        // --------------------------------------
        // Logic: Checks if update is required this month or if using monthly override
        let currentMonthRent = lastCalculatedBaseRent;

        // Check if we need to update the base rent calculation due to frequency or manual overrides
        const manualBase = input.monthlyBaseRent?.[month];
        if (manualBase !== undefined || i % frequencyMonths === 0) {
            const baseToUse = manualBase ?? input.baseRent;

            // Calculate standard linkage from Contract Base Index
            const rawRentRatio = (currentIndexValue / baseIndex.value) - 1;
            const partialLinkage = input.partialLinkage ?? 100;
            let effectiveRentChange = rawRentRatio * (partialLinkage / 100);

            if (input.isIndexBaseMinimum) {
                effectiveRentChange = Math.max(effectiveRentChange, 0);
            }

            if (input.maxIncreasePercentage !== undefined && input.maxIncreasePercentage > 0) {
                effectiveRentChange = Math.min(effectiveRentChange, input.maxIncreasePercentage / 100);
            }

            currentMonthRent = baseToUse * (1 + effectiveRentChange);
            lastCalculatedBaseRent = currentMonthRent;
        }

        // 4. Determine Actual Payment
        // ---------------------------
        let actuallyPaid = 0;
        if (input.monthlyActuals) {
            actuallyPaid = input.monthlyActuals[month] || 0;
        } else {
            actuallyPaid = input.actualPaidPerMonth || 0;
        }

        // 5. Update Running Balance
        // -------------------------
        // Expected Rent is a DEBIT (Negative in accounting, or we subtract it)
        // Payment is a CREDIT (Positive)
        // Let's stick to User's mental model: "Every expected payment is minus... difference is also indexed"
        // So Balance is typical "Account Balance".
        // Start 0.
        // Add Rent (Negative).
        // Add Payment (Positive).

        const expectedRentDebit = -Math.abs(currentMonthRent); // Ensure negative

        runningBalance += expectedRentDebit;
        runningBalance += actuallyPaid;

        monthlyBreakdown.push({
            month,
            shouldHavePaid: Math.round(Math.abs(currentMonthRent)), // Display as positive number for UI
            actuallyPaid: actuallyPaid,
            difference: Math.round(runningBalance), // The running balance at end of this month
            indexValue: currentIndexValue,
            linkageCoefficient: linkageChange * 100 // Show the monthly change %
        });
    }

    const totalBackPayOwed = runningBalance; // Final balance
    // Invert for "Owed" display if negative means debt
    // UI expects positive "Owed" if tenant owes money?
    // User: "Balance: -2,100 (Remaining Debt)".
    // So distinct Negative = Debt. Positive = Credit.
    // Return raw balance. UI logic should handle "You owe X" vs "Tenant owes X".

    // Note: The original interface might expect "totalBackPayOwed" to be positive if debt exists.
    // Let's check usage. Usually "Owed" implies Debt.
    // If result is -2000, that is "Debt of 2000".
    // I will return the raw signed balance but ensure the UI interprets it correctly.
    // Or, to be safe with existing types, I'll pass it as is and let UI show negative.

    return {
        totalBackPayOwed: Math.round(-runningBalance),
        monthlyBreakdown,
        totalMonths: months.length
    };
}
