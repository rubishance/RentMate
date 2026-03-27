import type { Contract } from '../types/database';

export interface PaymentFrequencyConfig {
    id: NonNullable<Contract['payment_frequency']>;
    labelKey: string;
}

export const PAYMENT_FREQUENCIES: PaymentFrequencyConfig[] = [
    { id: 'monthly', labelKey: 'monthly' },
    { id: 'bimonthly', labelKey: 'bimonthly' },
    { id: 'quarterly', labelKey: 'quarterly' },
    { id: 'semiannually', labelKey: 'semiannually' },
    { id: 'annually', labelKey: 'annually' }
];

export const getPaymentFrequencyConfig = (id: string | null | undefined): PaymentFrequencyConfig => {
    return PAYMENT_FREQUENCIES.find(p => p.id === id) || PAYMENT_FREQUENCIES[0];
};
