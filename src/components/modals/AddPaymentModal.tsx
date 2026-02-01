import { useState, useEffect } from 'react';
import { ContractsIcon as FileText } from '../icons/NavIcons';
import { CloseIcon as X, LoaderIcon as Loader2 } from '../icons/MessageIcons';
import { Modal } from '../ui/Modal';
import { Switch } from '../ui/Switch';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { DatePicker } from '../ui/DatePicker';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, addMonths } from 'date-fns';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../lib/utils';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '../../hooks/useToast';

/**
 * Payment Form Schema
 * Strictly defines the structure and validation rules for a payment.
 */
const paymentSchema = z.object({
    contract_id: z.string().min(1, 'selectContract'),
    amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: 'amountGreaterThanZero'
    }),
    due_date: z.string().min(1, 'dueDateRequired'),
    status: z.enum(['pending', 'paid', 'overdue']),
    payment_method: z.string().min(1, 'methodRequired'),
    paid_date: z.string().optional().or(z.literal('')),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface AddPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: {
        contract_id?: string;
        amount?: number | string;
        due_date?: string;
        status?: 'pending' | 'paid' | 'overdue';
        payment_method?: string;
    };
}

export function AddPaymentModal({ isOpen, onClose, onSuccess, initialData }: AddPaymentModalProps) {
    const { t } = useTranslation();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [contracts, setContracts] = useState<any[]>([]);
    const [fetchingContracts, setFetchingContracts] = useState(true);
    const [sessionStats, setSessionStats] = useState({ count: 0, total: 0 });

    const {
        register,
        handleSubmit,
        control,
        setValue,
        watch,
        reset,
        formState: { errors }
    } = useForm<PaymentFormValues>({
        resolver: zodResolver(paymentSchema),
        defaultValues: {
            contract_id: '',
            amount: '',
            due_date: new Date().toISOString().split('T')[0],
            status: 'pending',
            payment_method: 'bank_transfer',
            paid_date: '',
        }
    });

    const currentStatus = watch('status');
    const currentDueDate = watch('due_date');
    const currentAmount = watch('amount');

    useEffect(() => {
        if (isOpen) {
            fetchContracts();
            if (initialData) {
                reset({
                    contract_id: initialData.contract_id || '',
                    amount: initialData.amount ? initialData.amount.toString() : '',
                    due_date: initialData.due_date || new Date().toISOString().split('T')[0],
                    status: initialData.status || 'pending',
                    payment_method: initialData.payment_method || 'bank_transfer',
                    paid_date: '',
                });
            }
        } else {
            setSessionStats({ count: 0, total: 0 });
        }
    }, [isOpen, initialData, reset]);

    async function fetchContracts() {
        try {
            const { data, error } = await supabase
                .from('contracts')
                .select(`
                    id, 
                    status,
                    tenants,
                    properties (address)
                `)
                .in('status', ['active', 'archived']);

            if (error) throw error;
            setContracts(data || []);
            if (data && data.length === 1) {
                setValue('contract_id', data[0].id);
            }
        } catch (error) {
            console.error('Error fetching contracts:', error);
            toast.error(t('errorFetchingContracts'));
        } finally {
            setFetchingContracts(false);
        }
    }

    const onFormSubmit = async (values: PaymentFormValues, shouldClose: boolean = true) => {
        setLoading(true);
        const toastId = toast.loading(t('savingPayment'));

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('payments')
                .insert({
                    contract_id: values.contract_id,
                    user_id: user.id,
                    amount: parseFloat(values.amount),
                    currency: 'ILS',
                    due_date: values.due_date,
                    status: values.status,
                    payment_method: values.payment_method,
                    paid_date: values.status === 'paid' ? (values.paid_date || new Date().toISOString()) : null,
                });

            if (error) throw error;

            toast.dismiss(toastId);
            toast.success(t('paymentSavedSuccess'));

            onSuccess();
            setSessionStats(prev => ({
                count: prev.count + 1,
                total: prev.total + parseFloat(values.amount)
            }));

            if (shouldClose) {
                onClose();
                reset();
            } else {
                // Prepare for "Add Another" by incrementing month
                const nextDate = addMonths(parseISO(values.due_date), 1);
                setValue('due_date', format(nextDate, 'yyyy-MM-dd'));
                toast.info(t('addAnotherReady'));
            }
        } catch (error: any) {
            toast.dismiss(toastId);
            console.error('Error creating payment:', error);
            toast.error(t('errorSavingPayment'), error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('addPaymentTitle')}
            size="md"
        >
            <form onSubmit={handleSubmit((v) => onFormSubmit(v, true))} className="space-y-6">
                <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-1">
                        {t('contracts')}
                        {errors.contract_id && <span className="text-red-500 ml-2">({t(errors.contract_id.message as any)})</span>}
                    </label>
                    {fetchingContracts ? (
                        <div className="h-12 bg-gray-50 dark:bg-neutral-800 rounded-2xl animate-pulse" />
                    ) : (
                        <div className="relative group">
                            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                            <select
                                {...register('contract_id')}
                                className={cn(
                                    "w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-neutral-800 border-2 border-transparent focus:border-black dark:focus:border-white rounded-[1.25rem] text-sm font-bold outline-none appearance-none transition-all",
                                    errors.contract_id && "border-red-500/50 bg-red-50/10"
                                )}
                            >
                                <option value="">{t('selectContract')}</option>
                                {contracts.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.properties?.address} - {Array.isArray(c.tenants) ? c.tenants[0]?.name : (c.tenants?.name || t('unnamed'))}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Input
                            {...register('amount')}
                            label={t('amount')}
                            type="number"
                            placeholder="0.00"
                            error={errors.amount?.message ? t(errors.amount.message as any) : undefined}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-1">
                            {t('dueDate')}
                            {errors.due_date && <span className="text-red-500 ml-2">*</span>}
                        </label>
                        <Controller
                            name="due_date"
                            control={control}
                            render={({ field }) => (
                                <DatePicker
                                    value={field.value ? parseISO(field.value) : undefined}
                                    onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                />
                            )}
                        />
                    </div>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-neutral-800/50 rounded-[2rem] space-y-4 border border-black/5 dark:border-white/5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-widest text-black dark:text-white">{t('isPaid')}</span>
                        <Controller
                            name="status"
                            control={control}
                            render={({ field }) => (
                                <Switch
                                    checked={field.value === 'paid'}
                                    onChange={(checked) => field.onChange(checked ? 'paid' : 'pending')}
                                />
                            )}
                        />
                    </div>

                    <AnimatePresence>
                        {currentStatus === 'paid' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="pt-4 border-t border-black/5 dark:border-white/5"
                            >
                                <Input
                                    {...register('paid_date')}
                                    label={t('paidDate')}
                                    type="date"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-1">{t('method')}</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { label: 'transfer', value: 'bank_transfer' },
                            { label: 'bit', value: 'bit' },
                            { label: 'paybox', value: 'paybox' },
                            { label: 'check', value: 'check' },
                            { label: 'cash', value: 'cash' },
                            { label: 'other', value: 'other' }
                        ].map(method => (
                            <button
                                key={method.value}
                                type="button"
                                onClick={() => setValue('payment_method', method.value)}
                                className={cn(
                                    "py-3 px-2 rounded-2xl text-[10px] font-black uppercase tracking-tighter transition-all border-2",
                                    watch('payment_method') === method.value
                                        ? 'bg-black dark:bg-white border-black dark:border-white text-white dark:text-black shadow-lg'
                                        : 'bg-white dark:bg-neutral-900 border-black/5 dark:border-white/5 text-gray-400 hover:border-black/20 dark:hover:border-white/20'
                                )}
                            >
                                {t(method.label)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-8 border-t border-black/5 dark:border-white/5 bg-gray-50 dark:bg-neutral-900/50 flex gap-4 -mx-6 -mb-6 mt-6">
                    <Button
                        variant="outline"
                        onClick={handleSubmit((v) => onFormSubmit(v, false))}
                        disabled={loading}
                        className="flex-1"
                    >
                        {t('addAnother')}
                    </Button>
                    <Button
                        onClick={handleSubmit((v) => onFormSubmit(v, true))}
                        disabled={loading}
                        isLoading={loading}
                        className="flex-1"
                    >
                        {t('createAndClose')}
                    </Button>
                </div>

                {sessionStats.count > 0 && (
                    <div className="pt-4 text-[10px] font-black uppercase tracking-widest text-center text-primary animate-in fade-in slide-in-from-bottom-2">
                        {t('sessionAdded')}: {sessionStats.count} ({t('total')}: ₪{sessionStats.total.toLocaleString()})
                    </div>
                )}
            </form>
        </Modal >
    );
}
