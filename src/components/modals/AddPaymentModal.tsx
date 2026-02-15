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
            .eq('status', 'pending')
            .order('due_date', { ascending: true }); // Prioritize oldest

        if (data) setPendingPayments(data);
    }

    // Smart Matching Logic
    useEffect(() => {
        if (isMatchConfirmed) return; // Don't re-match if already confirmed

        const amount = parseFloat(currentAmount);
        const date = currentDueDate ? parseISO(currentDueDate) : null;

        if (amount && date && pendingPayments.length > 0) {
            // Find best match
            let bestMatch: any = null;
            let minScore = Infinity;

            pendingPayments.forEach(p => {
                const pDate = parseISO(p.due_date);
                const pAmount = p.amount;

                const daysDiff = Math.abs(differenceInDays(pDate, date));
                const amountDiff = Math.abs(pAmount - amount);
                const amountTolerance = pAmount * 0.05; // 5% tolerance

                if (daysDiff <= 7 && amountDiff <= amountTolerance) {
                    // Score: lower is better. Weighted distance.
                    // 1 day diff = 1 point. 1% amount diff = 10 points (money matters more?)
                    const score = daysDiff + (amountDiff / pAmount * 100);
                    if (score < minScore) {
                        minScore = score;
                        bestMatch = p;
                    }
                }
            });

            if (bestMatch && bestMatch.id !== matchedPayment?.id) {
                setMatchedPayment(bestMatch);
            } else if (!bestMatch && !matchedPayment) { // Only clear if we didn't manually select
                // setMatchedPayment(null); // Actually, let's keep manual selection distinct
            }
        }
    }, [currentAmount, currentDueDate, pendingPayments, isMatchConfirmed]);

    const confirmMatch = (payment: any) => {
        setMatchedPayment(payment);
        setIsMatchConfirmed(true);
        setValue('status', 'paid');
        // setValue('amount', payment.amount.toString()); // Keep user input amount?
        // Use user input amount as paid_amount, keep payment.amount as the original due amount.
        toast.success(t('paymentLinkedToPending'));
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

                {/* Manual Selection List Trigger (Always visible if payments exist) */}
                {pendingPayments.length > 0 && !isMatchConfirmed && (
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-1">
                            {t('linkToExpectedPayment')}
                        </label>
                        <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {pendingPayments.map(p => {
                                const isBestMatch = matchedPayment?.id === p.id;
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => confirmMatch(p)}
                                        className={cn(
                                            "w-full text-left p-3 rounded-xl border text-xs flex items-center justify-between transition-all",
                                            isBestMatch
                                                ? "bg-brand-50 border-brand-200 dark:bg-brand-900/20 dark:border-brand-800 ring-1 ring-brand-500"
                                                : "bg-white dark:bg-neutral-900 border-gray-100 dark:border-neutral-800 hover:border-gray-300 dark:hover:border-neutral-700"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-2 h-2 rounded-full", isBestMatch ? "bg-brand-500" : "bg-gray-300")} />
                                            <span className="font-bold">{format(parseISO(p.due_date), 'dd/MM/yyyy')}</span>
                                            <span className="text-gray-500">-</span>
                                            <span className="font-bold">₪{p.amount.toLocaleString()}</span>
                                        </div>
                                        {isBestMatch && (
                                            <span className="px-2 py-0.5 bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 text-[9px] font-black uppercase tracking-wider rounded-full">
                                                {t('bestMatch')}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Confirmation State */}
                <AnimatePresence>
                    {isMatchConfirmed && matchedPayment && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-2xl flex items-center gap-3"
                        >
                            <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                    {t('linkedToPaymentOf')} ₪{matchedPayment.amount}
                                </span>
                                <span className="text-[10px] text-emerald-600/80">
                                    {t('dueDate')}: {format(parseISO(matchedPayment.due_date), 'dd/MM/yyyy')}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsMatchConfirmed(false);
                                    setMatchedPayment(null);
                                }}
                                className="ml-auto p-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-xl text-emerald-600 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

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
