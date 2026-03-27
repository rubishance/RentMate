import { ArrowRightLeft, Banknote, CreditCard, FileSignature, Smartphone, CircleDashed } from 'lucide-react';
import { TranslationKeys } from '../hooks/useTranslation';

export type PaymentMethodId = 'transfer' | 'checks' | 'cash' | 'bit' | 'paybox' | 'other';

export interface PaymentMethodConfig {
    id: PaymentMethodId;
    labelKey: TranslationKeys;
    icon: React.ElementType;
}

export const PAYMENT_METHODS: PaymentMethodConfig[] = [
    { id: 'transfer', labelKey: 'transfer', icon: ArrowRightLeft },
    { id: 'checks', labelKey: 'checks', icon: FileSignature },
    { id: 'cash', labelKey: 'cash', icon: Banknote },
    { id: 'bit', labelKey: 'bit', icon: Smartphone },
    { id: 'paybox', labelKey: 'paybox', icon: Smartphone },
    { id: 'other', labelKey: 'other', icon: CircleDashed },
];

export const getPaymentMethodConfig = (id?: string | null): PaymentMethodConfig => {
    return PAYMENT_METHODS.find((pm) => pm.id === id) || PAYMENT_METHODS.find((pm) => pm.id === 'other')!;
};
