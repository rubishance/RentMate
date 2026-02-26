import { useState, useEffect } from 'react';
import { ContractsIcon as FileText } from '../icons/NavIcons';
import { CloseIcon as X, LoaderIcon as Loader2 } from '../icons/MessageIcons';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { DatePicker } from '../ui/DatePicker';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, addMonths } from 'date-fns';
import { CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../lib/utils';
import { useToast } from '../../hooks/useToast';

interface BulkCheckModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function BulkCheckModal({ isOpen, onClose, onSuccess }: BulkCheckModalProps) {
    const { t } = useTranslation();
    const toast = useToast();
    const [step, setStep] = useState<'input' | 'review'>('input');
    const [loading, setLoading] = useState(false);
    const [contracts, setContracts] = useState<any[]>([]);
    const [fetchingContracts, setFetchingContracts] = useState(true);

    const [formData, setFormData] = useState({
        contractId: '',
        startCheckNumber: '',
        count: '12',
        amount: '',
        firstDueDate: format(new Date(), 'yyyy-MM-dd')
    });

    const [generatedChecks, setGeneratedChecks] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            fetchContracts();
            setStep('input');
        }
    }, [isOpen]);

    async function fetchContracts() {
        try {
            const { data, error } = await supabase
                .from('contracts')
                .select(`
                    id, 
                    properties (address),
                    tenants
                `)
                .eq('status', 'active');

            if (error) throw error;
            setContracts(data || []);
            if (data && data.length === 1) {
                setFormData(prev => ({ ...prev, contractId: data[0].id }));
            }
        } catch (error) {
            console.error('Error fetching contracts:', error);
        } finally {
            setFetchingContracts(false);
        }
    }

    const generateChecks = () => {
        const count = parseInt(formData.count);
        const amount = parseFloat(formData.amount);
        const startNum = parseInt(formData.startCheckNumber) || 0;
        const firstDate = parseISO(formData.firstDueDate);

        if (!formData.contractId || isNaN(count) || isNaN(amount) || !formData.firstDueDate) {
            toast.error(t('pleaseFillAllFields'));
            return;
        }

        const checks = [];
        for (let i = 0; i < count; i++) {
            checks.push({
                due_date: format(addMonths(firstDate, i), 'yyyy-MM-dd'),
                amount: amount,
                reference: startNum > 0 ? `Check #${startNum + i}` : t('check'),
                payment_method: 'checks',
                status: 'pending'
            });
        }
        setGeneratedChecks(checks);
        setStep('review');
    };

    const handleSave = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        try {
            const toInsert = generatedChecks.map(c => ({
                ...c,
                user_id: user.id,
                contract_id: formData.contractId,
                currency: 'ILS'
            }));

            const { error } = await supabase
                .from('payments')
                .insert(toInsert);

            if (error) throw error;

            toast.success(t('bulkChecksAddedSuccess').replace('{count}', generatedChecks.length.toString()));
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving bulk checks:', error);
            toast.error(t('errorSavingPayments'));
        } finally {
            setLoading(false);
        }
    };

    const removeCheck = (index: number) => {
        setGeneratedChecks(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('bulkCheckEntryTitle')}
            size="lg"
        >
            <div className="space-y-6">
                <AnimatePresence mode="wait">
                    {step === 'input' ? (
                        <motion.div
                            key="input"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-6"
                        >
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-1">
                                    {t('contract')}
                                </label>
                                {fetchingContracts ? (
                                    <div className="h-12 bg-gray-50 dark:bg-neutral-800 rounded-2xl animate-pulse" />
                                ) : (
                                    <div className="relative">
                                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                                        <select
                                            value={formData.contractId}
                                            onChange={(e) => setFormData({ ...formData, contractId: e.target.value })}
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-neutral-800 border-2 border-transparent focus:border-black dark:focus:border-white rounded-[1.25rem] text-sm font-bold outline-none appearance-none transition-all"
                                        >
                                            <option value="">{t('selectContract')}</option>
                                            {contracts.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.properties?.address} - {c.tenants?.[0]?.name || t('unnamed')}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label={t('amountPerCheck')}
                                    type="number"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    placeholder="0.00"
                                />
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-1">
                                        {t('firstDueDate')}
                                    </label>
                                    <DatePicker
                                        value={parseISO(formData.firstDueDate)}
                                        onChange={(date) => setFormData({ ...formData, firstDueDate: date ? format(date, 'yyyy-MM-dd') : '' })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label={t('numberOfChecks')}
                                    type="number"
                                    value={formData.count}
                                    onChange={(e) => setFormData({ ...formData, count: e.target.value })}
                                />
                                <Input
                                    label={t('startCheckNumber')}
                                    type="number"
                                    value={formData.startCheckNumber}
                                    onChange={(e) => setFormData({ ...formData, startCheckNumber: e.target.value })}
                                    placeholder="500"
                                />
                            </div>

                            <Button onClick={generateChecks} className="w-full h-16 !text-white" style={{ color: 'white' }}>
                                {t('previewChecks')}
                            </Button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="review"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-2xl flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                                <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                                    {t('bulkCheckReviewDesc')}
                                </p>
                            </div>

                            <div className="max-h-[40vh] overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                                {generatedChecks.map((check, idx) => (
                                    <div
                                        key={idx}
                                        className="p-4 bg-gray-50 dark:bg-neutral-800 rounded-2xl border border-gray-100 dark:border-neutral-700 flex items-center justify-between group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-neutral-700 flex items-center justify-center font-black text-xs">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold">{check.reference}</div>
                                                <div className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                                                    {format(parseISO(check.due_date), 'dd/MM/yyyy')}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-sm font-black text-foreground">₪{check.amount.toLocaleString()}</div>
                                            <button
                                                onClick={() => removeCheck(idx)}
                                                className="p-2 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-4">
                                <Button variant="outline" onClick={() => setStep('input')} className="flex-1">
                                    {t('back')}
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    isLoading={loading}
                                    disabled={loading || generatedChecks.length === 0}
                                    className="flex-2 !text-white"
                                    style={{ color: 'white' }}
                                >
                                    {t('approveAndCreate')}
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </Modal>
    );
}
