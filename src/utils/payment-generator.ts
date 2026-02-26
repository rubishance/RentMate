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
    let current = parseISO(startDate);
    const end = parseISO(endDate);

    const freq = paymentFrequency?.toLowerCase() || 'monthly';
    const monthStep = freq === 'quarterly' ? 3 : freq === 'annually' ? 12 : 1;

    let count = 0;
    // Limit to 120 payments (10 years) to prevent infinite loops in edge cases
    while ((isBefore(current, end) || isEqual(current, end)) && count < 120) {
        const year = current.getFullYear();
        const month = current.getMonth();

        // Handle months with fewer days than paymentDay (e.g., Feb 30th -> Feb 28th)
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const actualDay = Math.min(paymentDay || 1, daysInMonth);

        const dueDate = new Date(year, month, actualDay);

        payments.push({
            ...(contractId ? { contract_id: contractId } : {}),
            ...(userId ? { user_id: userId } : {}),
            amount: baseRent,
            currency: currency || 'ILS',
            due_date: format(dueDate, 'yyyy-MM-dd'),
            status: 'pending',
            original_amount: baseRent,
            index_linkage_rate: 0
        });

        current = addMonths(current, monthStep);
        count++;
    }

    return payments;
}
