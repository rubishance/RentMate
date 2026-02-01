import { getIndexRange } from '../services/index-data.service';
import { addMonths, addYears, format, parseISO } from 'date-fns';

interface PaymentScheduleItem {
    contract_id?: string;
    amount: number;
    currency: 'ILS' | 'USD' | 'EUR';
    due_date: string;
    status: 'pending';
    index_linkage_rate?: number;
    original_amount: number;
}

interface GenerationParams {
    startDate: string;
    endDate: string;
    baseRent: number;
    currency: 'ILS' | 'USD' | 'EUR';
    paymentFrequency: 'monthly' | 'quarterly' | 'annually';
    paymentDay: number;
    linkageType: 'cpi' | 'housing' | 'construction' | 'usd' | 'eur' | 'none';
    linkageSubType?: 'known' | 'respect_of' | 'base' | null; // Known = Yadua, Respect Of = B'gin
    baseIndexDate?: string | null;
    baseIndexValue?: number | null;
    linkageCeiling?: number | null;
    linkageFloor?: number | null;
    rent_periods?: {
        startDate: string;
        amount: number;
        currency: 'ILS' | 'USD' | 'EUR';
    }[];
}

/**
 * Generates a schedule of expected payments based on contract terms.
 * Calculates linkage for past/present payments if index data is available.
 */
export async function generatePaymentSchedule(params: GenerationParams): Promise<PaymentScheduleItem[]> {
    const {
        startDate,
        endDate,
        baseRent,
        currency,
        paymentFrequency,
        paymentDay,
        linkageType,
        linkageSubType,
        baseIndexDate,
        baseIndexValue,
        linkageCeiling,
        linkageFloor,
        rent_periods
    } = params;

    const payments: PaymentScheduleItem[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    let current = new Date(start);

    // 1. Fetch relevant index data if linkage is active
    const indexMap: Record<string, number> = {};
    if (linkageType !== 'none' && baseIndexValue) {
        // Fetch indices from a few months before start date (buffer for 'known' index) to end date
        const fetchStart = new Date(start);
        fetchStart.setMonth(fetchStart.getMonth() - 2);
        const fetchEnd = new Date(end);
        fetchEnd.setMonth(fetchEnd.getMonth() + 1); // Buffer

        const indices = await getIndexRange(
            linkageType,
            fetchStart.toISOString().split('T')[0],
            fetchEnd.toISOString().split('T')[0]
        );

        // Create a map for easy lookup: 'YYYY-MM' -> value
        indices.forEach(idx => {
            const key = idx.date.substring(0, 7); // YYYY-MM
            indexMap[key] = idx.value;
        });
    }

    // 2. Generate Payments
    while (current <= end) {
        // Determine Due Date
        const year = current.getFullYear();
        const month = current.getMonth();

        // Find the last day of the target month
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Clamp the payment day to the maximum days in that month
        // e.g., if paymentDay is 31, in Feb it becomes 28 or 29.
        const actualDay = Math.min(paymentDay, daysInMonth);

        const dueDate = new Date(year, month, actualDay);

        const dueStr = format(dueDate, 'yyyy-MM-dd');
        const monthKey = dueStr.substring(0, 7); // YYYY-MM of the payment

        // Determine Base Rent for this period (Handle Rent Steps)
        let currentBaseRent = baseRent;
        let currentCurrency = currency;

        if (rent_periods && rent_periods.length > 0) {
            // Find the latest start date that is before or on the due date
            const applicablePeriod = rent_periods
                .filter(p => p.startDate <= dueStr)
                .sort((a, b) => b.startDate.localeCompare(a.startDate))[0];

            if (applicablePeriod) {
                currentBaseRent = applicablePeriod.amount;
                currentCurrency = applicablePeriod.currency;
            }
        }

        let amount = currentBaseRent;
        let linkageRate = 0;

        // 3. Calculate Linkage
        if (linkageType !== 'none' && baseIndexValue) {
            let targetIndexValue: number | null = null;

            // Determine relevant index date based on sub-type
            if (linkageSubType === 'known') {
                // Madad Yadua: Index published on the 15th BEFORE the payment date.
                // If payment is on 16th, index published on 15th is valid (Index of previous month).
                // If payment is on 10th, index published on 15th (prev month) hasn't happened yet relative to THIS month?
                // Actually:
                // "Known Index" usually refers to the last published index.
                // Indices publish on the 15th of the month (for the previous month).
                // Ex: On Jan 20th. Known index is Dec index (pub Jan 15).
                // Ex: On Jan 10th. Known index is Nov index (pub Dec 15).

                const dayOfMonth = dueDate.getDate();
                const indexDate = new Date(dueDate);

                if (dayOfMonth < 15) {
                    // Go back 2 months for the index context (Nov index for Jan 10 payment)
                    indexDate.setMonth(indexDate.getMonth() - 2);
                } else {
                    // Go back 1 month (Dec index for Jan 20 payment)
                    indexDate.setMonth(indexDate.getMonth() - 1);
                }

                const lookupKey = indexDate.toISOString().substring(0, 7);
                targetIndexValue = indexMap[lookupKey] || null;

            } else if (linkageSubType === 'respect_of' || !linkageSubType) {
                // Madad B'gin: Index OF the payment month.
                // This is usually not known until next month.
                // If we are generating "Expected" payments in the future, this is definitely unknown.
                // If we are generating for the past, we might know it.
                const lookupKey = monthKey;
                targetIndexValue = indexMap[lookupKey] || null;
            }

            // Apply Calculation if we have an index
            if (targetIndexValue) {
                const ratio = targetIndexValue / baseIndexValue;
                linkageRate = (ratio - 1) * 100; // Percentage change

                // Calculate new amount
                amount = currentBaseRent * ratio;

                // Apply Floor/Ceiling
                // Floor: Usually the base rent itself is the floor, or a specific value.
                // If linkageFloor is explicitly set, use it. Otherwise assume baseRent is floor if linkage is positive-only?
                // Standard Israeli contracts usually say "won't decrease below base".
                const effectiveFloor = linkageFloor ?? currentBaseRent;
                if (amount < effectiveFloor) amount = effectiveFloor;

                // Ceiling (Maximum % Rise)
                if (linkageCeiling !== null && linkageCeiling !== undefined) {
                    const maxAmount = currentBaseRent * (1 + linkageCeiling / 100);
                    if (amount > maxAmount) {
                        amount = maxAmount;
                    }
                }
            }
        }

        payments.push({
            amount: Number(amount.toFixed(2)),
            currency: currentCurrency,
            due_date: dueStr,
            status: 'pending',
            original_amount: currentBaseRent,
            index_linkage_rate: Number(linkageRate.toFixed(2))
        });

        // Advance to next period
        const freq = paymentFrequency.toLowerCase();
        if (freq === 'monthly') {
            current = addMonths(current, 1);
        } else if (freq === 'quarterly') {
            current = addMonths(current, 3);
        } else if (freq === 'annually') {
            current = addYears(current, 1);
        } else {
            // Safety: prevent infinite loop if frequency is unknown
            console.error('[PaymentGenerator] Unknown frequency:', paymentFrequency);
            break;
        }
    }

    return payments;
}
