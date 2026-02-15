import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';
import { useTranslation } from './useTranslation';

export function usePaymentRepair() {
    const { t } = useTranslation();
    const { success, error: toastError, info } = useToast();
    const [isRepairing, setIsRepairing] = useState(false);

    const scanAndRepair = useCallback(async (silent = false) => {
        if (isRepairing) return;
        setIsRepairing(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Get all active contracts
            const { data: contracts, error: contractError } = await supabase
                .from('contracts')
                .select('id, property_id, properties(address, city), start_date, end_date, base_rent, currency, payment_frequency, payment_day, linkage_type, linkage_sub_type, base_index_date, base_index_value, linkage_ceiling, linkage_floor, rent_periods(startDate, amount, currency)')
                .eq('user_id', user.id)
                .eq('status', 'active');

            if (contractError) throw contractError;

            // 2. Contracts with payments
            const { data: payments, error: paymentError } = await supabase
                .from('payments')
                .select('contract_id')
                .eq('user_id', user.id);

            if (paymentError) throw paymentError;

            const contractIdsWithPayments = new Set(payments?.map(p => p.contract_id));
            const orphans = contracts?.filter(c => !contractIdsWithPayments.has(c.id)) || [];

            if (orphans.length === 0) {
                if (!silent) {
                    success(t('allGood'), t('noMissingPaymentsFound'));
                }
                return;
            }

            if (!silent) {
                info(t('repairing'), t('foundMissingPaymentsRepairing', { count: orphans.length }));
            }

            // 3. Repair each orphan
            let repairedCount = 0;
            for (const contract of orphans) {
                try {
                    const { data: genData, error: genError } = await supabase.functions.invoke('generate-payments', {
                        body: {
                            startDate: contract.start_date,
                            endDate: contract.end_date,
                            baseRent: contract.base_rent,
                            currency: contract.currency,
                            paymentFrequency: contract.payment_frequency,
                            paymentDay: contract.payment_day,
                            linkageType: contract.linkage_type,
                            linkageSubType: contract.linkage_sub_type,
                            baseIndexDate: contract.base_index_date,
                            baseIndexValue: contract.base_index_value,
                            linkageCeiling: contract.linkage_ceiling,
                            linkageFloor: contract.linkage_floor,
                            rent_periods: contract.rent_periods
                        }
                    });

                    if (genError) throw genError;

                    const schedule = genData?.payments || [];
                    if (schedule.length > 0) {
                        const { error: insertError } = await supabase.from('payments').insert(
                            schedule.map((p: any) => ({
                                ...p,
                                contract_id: contract.id,
                                user_id: user.id
                            }))
                        );
                        if (insertError) throw insertError;
                        repairedCount++;
                    }
                } catch (err) {
                    console.error(`Failed to repair contract ${contract.id}`, err);
                }
            }

            if (repairedCount > 0) {
                success(t('success'), t('repairedPayments', { count: repairedCount }));
                return true; // Signal that repairs were made (to refresh list)
            }

        } catch (err: any) {
            console.error('Repair error:', err);
            if (!silent) {
                toastError(t('error'), 'Failed to repair payments');
            }
        } finally {
            setIsRepairing(false);
        }
        return false;
    }, [isRepairing, t, success, toastError, info]);

    return {
        scanAndRepair,
        isRepairing
    };
}
