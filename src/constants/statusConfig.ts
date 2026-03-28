export type ContractStatus = 'active' | 'archived';
export type PropertyState = 'occupied' | 'vacant';
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

export interface StatusConfig {
    id: string;
    labelKey: string;
    fallbackHe: string;
    fallbackEn: string;
    color: string;
    bg: string;
    border?: string;
}

export const CONTRACT_STATUSES: Record<ContractStatus, StatusConfig> = {
    active: {
        id: 'active',
        labelKey: 'active',
        fallbackHe: 'פעיל',
        fallbackEn: 'Active',
        color: 'text-emerald-700 dark:text-emerald-400',
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        border: 'border-emerald-200 dark:border-emerald-800/50'
    },
    archived: {
        id: 'archived',
        labelKey: 'archived',
        fallbackHe: 'ארכיון',
        fallbackEn: 'Archived',
        color: 'text-slate-700 dark:text-slate-400',
        bg: 'bg-slate-100 dark:bg-slate-800',
        border: 'border-slate-200 dark:border-slate-700'
    }
};

export const PROPERTY_STATES: Record<PropertyState, StatusConfig> = {
    occupied: {
        id: 'occupied',
        labelKey: 'occupied',
        fallbackHe: 'מושכר',
        fallbackEn: 'Occupied',
        color: 'text-emerald-700 dark:text-emerald-400',
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        border: 'border-emerald-200 dark:border-emerald-800/50'
    },
    vacant: {
        id: 'vacant',
        labelKey: 'vacant',
        fallbackHe: 'פנוי',
        fallbackEn: 'Vacant',
        color: 'text-orange-700 dark:text-orange-400',
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        border: 'border-orange-200 dark:border-orange-800/50'
    }
};

export const PAYMENT_STATUSES: Record<PaymentStatus, StatusConfig> = {
    pending: {
        id: 'pending',
        labelKey: 'pending',
        fallbackHe: 'ממתין',
        fallbackEn: 'Pending',
        color: 'text-amber-700 dark:text-amber-400',
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        border: 'border-amber-200 dark:border-amber-800/50'
    },
    paid: {
        id: 'paid',
        labelKey: 'paid',
        fallbackHe: 'שולם',
        fallbackEn: 'Paid',
        color: 'text-emerald-700 dark:text-emerald-400',
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        border: 'border-emerald-200 dark:border-emerald-800/50'
    },
    overdue: {
        id: 'overdue',
        labelKey: 'overdue',
        fallbackHe: 'באיחור',
        fallbackEn: 'Overdue',
        color: 'text-rose-700 dark:text-rose-400',
        bg: 'bg-rose-100 dark:bg-rose-900/30',
        border: 'border-rose-200 dark:border-rose-800/50'
    },
    cancelled: {
        id: 'cancelled',
        labelKey: 'cancelled',
        fallbackHe: 'מבוטל',
        fallbackEn: 'Cancelled',
        color: 'text-slate-500 dark:text-slate-400',
        bg: 'bg-slate-100 dark:bg-slate-800',
        border: 'border-slate-200 dark:border-slate-700'
    }
};

export const getContractStatusConfig = (status: string | null | undefined): StatusConfig => {
    return CONTRACT_STATUSES[status as ContractStatus] || CONTRACT_STATUSES.active;
};

export const getPropertyStateConfig = (state: string | null | undefined): StatusConfig => {
    return PROPERTY_STATES[state as PropertyState] || PROPERTY_STATES.vacant;
};

export const getPaymentStatusConfig = (status: string | null | undefined): StatusConfig => {
    return PAYMENT_STATUSES[status as PaymentStatus] || PAYMENT_STATUSES.pending;
};
