import { addMonths, format, parseISO, isBefore, isEqual } from 'date-fns';

export interface GeneratePaymentsParams {
    startDate: string;
    endDate: string;
    baseRent: number;
    currency: string;
    paymentFrequency: string; // 'monthly' | 'quarterly' | 'annually'
    paymentDay: number;
    contractId?: string;
    userId?: string;
}

/**
 * Robust client-side generator for payments when the edge function fails or is unavailable.
 * Respects paymentDay, proper local timezones via date-fns, and payment frequency.
 */
export function generatePaymentSchedule(params: GeneratePaymentsParams): any[] {
    const { startDate, endDate, baseRent, currency, paymentFrequency, paymentDay, contractId, userId } = params;

    if (!startDate || !endDate) return [];

    const payments = [];
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    const freq = paymentFrequency?.toLowerCase() || 'monthly';
    const monthStep = freq === 'quarterly' ? 3 : freq === 'annually' ? 12 : 1;

    // Normalize start to the 1st of the month so we loop strictly by calendar months/periods
    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    let count = 0;
    
    // Limit to 120 payments (10 years) to prevent infinite loops in edge cases
    while ((isBefore(current, end) || isEqual(current, end)) && count < 120) {
        const year = current.getFullYear();
        const month = current.getMonth();

        // Calculate period boundaries
        const periodStart = new Date(year, month, 1);
        const periodEnd = new Date(year, month + monthStep, 0); // Last day of the step's final month

        // Determine active days bounded by contract start and end
        const activeStart = periodStart < start ? start : periodStart;
        const activeEnd = periodEnd > end ? end : periodEnd;

        // If activeStart > activeEnd, this means the period doesn't intersect with the contract, skip
        if (activeStart <= activeEnd) {
            // Calculate precisely using UTC epochs at midnight to avoid DST issues
            const getDaysBetween = (d1: Date, d2: Date) => {
                const u1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
                const u2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
                return Math.floor((u2 - u1) / (1000 * 60 * 60 * 24)) + 1;
            };

            const periodTotalDays = getDaysBetween(periodStart, periodEnd);
            const activeDays = getDaysBetween(activeStart, activeEnd);

            // Amount Proration
            let amount = baseRent;
            if (activeDays < periodTotalDays) {
                amount = baseRent * (activeDays / periodTotalDays);
                amount = Number(amount.toFixed(2)); // Round to 2 decimals
            }

            // Handle months with fewer days than paymentDay (e.g., Feb 30th -> Feb 28th)
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const actualDay = Math.min(paymentDay || 1, daysInMonth);
            
            let dueDate = new Date(year, month, actualDay);
            // Ensure first payment is not due before the start date itself
            if (count === 0 && dueDate < start) {
                dueDate = new Date(start);
            }

            payments.push({
                ...(contractId ? { contract_id: contractId } : {}),
                ...(userId ? { user_id: userId } : {}),
                amount: amount,
                currency: currency || 'ILS',
                due_date: format(dueDate, 'yyyy-MM-dd'),
                status: 'pending',
                original_amount: amount,
                index_linkage_rate: 0
            });
        }

        current = addMonths(current, monthStep);
        count++;
    }

    return payments;
}
