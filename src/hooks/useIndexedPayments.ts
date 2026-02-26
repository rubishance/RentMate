import { useState, useEffect } from 'react';
import { calculateStandard } from '../services/calculator.service';
import { format, subMonths, parseISO } from 'date-fns';

export function useIndexedPayments(payments: any[]) {
    const [indexedAmounts, setIndexedAmounts] = useState<Record<string, number | null>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!payments.length) return;

        const calculateAll = async () => {
            setLoading(true);
            const newIndexedAmounts: Record<string, number | null> = {};

            // 1. Identify payments that need indexing
            const indexablePayments = payments.filter(p =>
                p.displayType === 'rent' &&
                p.contracts?.linkage_type &&
                p.contracts.linkage_type !== 'none'
            );

            if (indexablePayments.length === 0) {
                setLoading(false);
                return;
            }

            // 2. Determine date ranges (logic removed for unused variable cleanup, but could be restored if caching added)

            // 3. Perform the calculations
            // Since we need to wait for each calculation, and calculateStandard fetches internally,
            // we'll do it sequentially or in chunks for simplicity, but use cached/batched data if possible.
            // For now, let's call calculateStandard which handles its own logic.
            // PRO TIP: In a real app, calculateStandard should be optimized to use a local index cache.

            for (const p of indexablePayments) {
                try {
                    const result = await calculateStandard({
                        baseRent: p.contracts.base_rent || p.amount,
                        linkageType: p.contracts.linkage_type,
                        baseDate: p.contracts.base_index_date?.substring(0, 7),
                        targetDate: p.due_date.substring(0, 7),
                        linkageSubType: p.contracts.linkage_sub_type || 'respect_of',
                        linkageCeiling: p.contracts.linkage_ceiling,
                        isIndexBaseMinimum: p.contracts.linkage_floor === 0,
                        partialLinkage: 100 // Default to full linkage as per user request context
                    });

                    if (result) {
                        newIndexedAmounts[p.id] = result.newRent;
                    } else {
                        newIndexedAmounts[p.id] = null;
                    }
                } catch (_err) {
                    newIndexedAmounts[p.id] = null;
                }
            }

            setIndexedAmounts(newIndexedAmounts);
            setLoading(false);
        };

        calculateAll();
    }, [payments]);

    return { indexedAmounts, loading };
}
