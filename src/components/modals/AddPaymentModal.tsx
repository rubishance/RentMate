import { useState, useEffect } from 'react';
import { ContractsIcon as FileText } from '../icons/NavIcons';
import { CloseIcon as X, LoaderIcon as Loader2 } from '../icons/MessageIcons';
import { Modal } from '../ui/Modal';

import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { DatePicker } from '../ui/DatePicker';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, addMonths, differenceInDays } from 'date-fns';
import { CheckCircle2 } from 'lucide-react';
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
    const [pendingPayments, setPendingPayments] = useState<any[]>([]);
    const [matchedPayment, setMatchedPayment] = useState<any | null>(null);
    const [isMatchConfirmed, setIsMatchConfirmed] = useState(false);

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
            status: 'paid',
            payment_method: 'bank_transfer',
            paid_date: new Date().toISOString().split('T')[0],
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
                    status: initialData.status || 'paid',
                    payment_method: initialData.payment_method || 'bank_transfer',
                    paid_date: initialData.status === 'paid' ? (initialData.due_date || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
                });
            }
        } else {
            setSessionStats({ count: 0, total: 0 });
        }
    }, [isOpen, initialData, reset]);

    async function fetchContracts() {
        setFetchingContracts(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('contracts')
                .select(`
                        id, 
                        status,
                        tenants,
                        properties (address)
                    `)
                .eq('user_id', user.id)
                .in('status', ['active']); // Only active contracts allowed for new payments

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

    // Fetch pending payments when contract is selected
    useEffect(() => {
        const contractId = watch('contract_id');
        if (contractId) {
            fetchPendingPayments(contractId);
        } else {
            setPendingPayments([]);
        }
    }, [watch('contract_id')]);

    async function fetchPendingPayments(contractId: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('payments')
            .select('*')
            .eq('contract_id', contractId)
            .eq('user_id', user.id)
            .eq('status', 'pending');

        if (data) setPendingPayments(data);
    }

    // Smart Matching Logic
    useEffect(() => {
        if (isMatchConfirmed) return; // Don't re-match if already confirmed

        const amount = parseFloat(currentAmount);
        const date = currentDueDate ? parseISO(currentDueDate) : null;

        if (amount && date && pendingPayments.length > 0) {
            const match = pendingPayments.find(p => {
                const pDate = parseISO(p.due_date);
                const pAmount = p.amount;

                const daysDiff = Math.abs(differenceInDays(pDate, date));
                const amountDiff = Math.abs(pAmount - amount);
                const amountTolerance = pAmount * 0.03; // 3% tolerance

                return daysDiff <= 3 && amountDiff <= amountTolerance;
            });

            if (match && match.id !== matchedPayment?.id) {
                setMatchedPayment(match);
            } else if (!match) {
                setMatchedPayment(null);
            }
        }
    }, [currentAmount, currentDueDate, pendingPayments, isMatchConfirmed]);

    const confirmMatch = () => {
        if (matchedPayment) {
            setIsMatchConfirmed(true);
            setValue('status', 'paid');
            setValue('amount', matchedPayment.amount.toString()); // Align amount to exact due? Or keep user amount? 
            // Plan says "filling in paid_amount". User input is likely the paid amount.
            // If we merge, we should probably record the user's input as the PAID amount, but keep the original DUE amount?
            // But existing table structure: amount is DUE amount, paid_amount is PAID amount.
            // So if we pay an existing payment, we update `paid_amount` with `currentAmount`.
            toast.success(t('paymentLinkedToPending'));
        }
    };

    const onFormSubmit = async (values: PaymentFormValues, shouldClose: boolean = true) => {
        setLoading(true);
        const toastId = toast.loading(t('savingPayment'));

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Handle Smart Match Update OR New Insert
            if (isMatchConfirmed && matchedPayment) {
                const { error: updateError } = await supabase
                    .from('payments')
                    .update({
                        status: 'paid',
                        paid_amount: parseFloat(values.amount),
                        paid_date: values.paid_date || new Date().toISOString(),
                        payment_method: values.payment_method,
                        // Append reference? or just overwrite? Let's overwrite/set if empty
                    })
                    .eq('id', matchedPayment.id);

                if (updateError) throw updateError;
            } else {
                // Standard Insert
                const { error: insertError } = await supabase
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
                if (insertError) throw insertError;
            }

            toast.dismiss(toastId);
            toast.success(t('paymentSavedSuccess'));

            onSuccess();
            setSessionStats(prev => ({
                count: prev.count + 1,
                total: prev.total + parseFloat(values.amount)
            }));

            if (shouldClose) {
                onClose();
                onClose();
                reset();
                setIsMatchConfirmed(false);
                setMatchedPayment(null);
            } else {
                // Prepare for "Add Another"
                const nextDate = addMonths(parseISO(values.due_date), 1);
                setValue('due_date', format(nextDate, 'yyyy-MM-dd'));
                toast.info(t('addAnotherReady'));
                setIsMatchConfirmed(false);
                setMatchedPayment(null);
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


                {/* Smart Match Alert */}
                <AnimatePresence>
                    {matchedPayment && !isMatchConfirmed && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-brand-50/50 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-900/20 rounded-2xl overflow-hidden"
                        >
                            <div className="p-4 flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                                    <Loader2 className="w-5 h-5 text-brand-600 animate-pulse" />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-brand-700 dark:text-brand-300">
                                            {t('possibleMatchFound')}
                                        </h4>
                                        <p className="text-xs text-brand-600/80 dark:text-brand-400/80 mt-1">
                                            {t('matchFoundDesc').replace('{date}', format(parseISO(matchedPayment.due_date), 'dd/MM')).replace('{amount}', matchedPayment.amount)}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={confirmMatch}
                                            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors"
                                        >
                                            {t('yesLinkPayment')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMatchedPayment(null)}
                                            className="px-4 py-2 bg-transparent hover:bg-brand-100/50 text-brand-600 dark:text-brand-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors"
                                        >
                                            {t('noCreateNew')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {isMatchConfirmed && (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-2xl flex items-center gap-3 animate-in fade-in">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        </div>
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            {t('linkedToPaymentOf')} ₪{matchedPayment?.amount} ({format(parseISO(matchedPayment?.due_date), 'dd/MM')})
                        </span>
                        <button type="button" onClick={() => setIsMatchConfirmed(false)} className="ml-auto text-emerald-600 hover:text-emerald-800">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

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
                        className="flex-1 !text-white"
                        style={{ color: 'white' }}
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
