import { useState, useEffect } from 'react';
import { TrendingUp, ChevronDown, ChevronUp, Share2, Trash2, Plus } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../lib/utils';
import { DatePicker } from '../ui/DatePicker';
import { calculateReconciliation } from '../../services/calculator.service';
import { MessageGeneratorModal } from '../modals/MessageGeneratorModal';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import type { ReconciliationResult } from '../../types/database';

interface ReconciliationCalculatorProps {
    initialValues?: {
        baseRent?: string;
        linkageType?: 'cpi' | 'housing' | 'construction' | 'usd' | 'eur';
        contractStartDate?: string;
        periodStart?: string;
        periodEnd?: string;
        actualPaid?: string;
        linkageSubType?: 'known' | 'respect_of';
        updateFrequency?: 'monthly' | 'quarterly' | 'semiannually' | 'annually';
        recIndexBaseMinimum?: boolean;
        maxIncreasePercentage?: string;
    };
    shouldAutoCalculate?: boolean;
}

export function ReconciliationCalculator({ initialValues, shouldAutoCalculate }: ReconciliationCalculatorProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    // Core State
    const [recBaseRent, setRecBaseRent] = useState(initialValues?.baseRent || '5000');
    const [recLinkageType, setRecLinkageType] = useState<'cpi' | 'housing' | 'construction' | 'usd' | 'eur'>(initialValues?.linkageType || 'cpi');
    const [contractStartDate, setContractStartDate] = useState(initialValues?.contractStartDate || '');
    const [periodStart, setPeriodStart] = useState(initialValues?.periodStart || '');
    const [periodEnd, setPeriodEnd] = useState(initialValues?.periodEnd || '');
    const [actualPaid, setActualPaid] = useState(initialValues?.actualPaid || '5000');
    const [recPartialLinkage] = useState('100');

    // Advanced State
    const [recLinkageSubType, setRecLinkageSubType] = useState<'known' | 'respect_of'>(initialValues?.linkageSubType || 'known');
    const [recUpdateFrequency, setRecUpdateFrequency] = useState<'monthly' | 'quarterly' | 'semiannually' | 'annually'>(initialValues?.updateFrequency || 'monthly');
    const [recIndexBaseMinimum, setRecIndexBaseMinimum] = useState<boolean>(initialValues?.recIndexBaseMinimum ?? true);
    const [recMaxIncrease, setRecMaxIncrease] = useState<string>(initialValues?.maxIncreasePercentage || '');
    const [showRecAdvanced, setShowRecAdvanced] = useState(false);

    // Lists State
    const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
    const [expectedHistory, setExpectedHistory] = useState<any[]>([]);
    const [monthlyActuals, setMonthlyActuals] = useState<Record<string, number> | null>(null);

    // Drafts
    const [draftExpected, setDraftExpected] = useState<{ due_date: string; amount: string }>({ due_date: '', amount: '' });
    const [draftPayment, setDraftPayment] = useState<{ due_date: string; amount: string }>({ due_date: '', amount: '' });

    // Results
    const [result, setResult] = useState<ReconciliationResult | null>(null);
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);

    // Contracts
    const [contracts, setContracts] = useState<any[]>([]);

    useEffect(() => {
        fetchContracts();
    }, []);

    useEffect(() => {
        if (shouldAutoCalculate && recBaseRent && contractStartDate && periodStart && periodEnd) {
            handleCalculate();
            setShowBreakdown(true);
        }
    }, [shouldAutoCalculate]);

    const fetchContracts = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('contracts')
                .select(`
                    id, 
                    base_rent, 
                    linkage_type, 
                    start_date, 
                    end_date,
                    base_index_date, 
                    properties (address), 
                    tenants (name)
                `)
                .eq('user_id', user.id); // Enforce ownership

            if (error) throw error;
            if (data) setContracts(data);
        } catch (error) {
            console.error('Error fetching contracts:', error);
        }
    };

    const updateMonthlyActuals = (payments: any[]) => {
        const actualsMap: Record<string, number> = {};
        payments.forEach(p => {
            const month = p.due_date.slice(0, 7);
            actualsMap[month] = (actualsMap[month] || 0) + p.amount;
        });
        setMonthlyActuals(actualsMap);
    };

    const handlePaymentChange = (id: string, field: 'amount' | 'due_date', value: string) => {
        const updated = paymentHistory.map(p => {
            if (p.id === id) {
                if (field === 'amount') return { ...p, amount: parseFloat(value) || 0 };
                if (field === 'due_date') return { ...p, due_date: value };
            }
            return p;
        });
        setPaymentHistory(updated);
        updateMonthlyActuals(updated);
    };

    const handleAddPayment = () => {
        if (!draftPayment.due_date || !draftPayment.amount) {
            alert(t('fillAllFields')); // "Please fill all fields"
            return;
        }

        const newPayment = {
            id: `manual-${Date.now()}`,
            due_date: draftPayment.due_date,
            amount: parseFloat(draftPayment.amount) || 0,
            status: 'manual'
        };
        const updated = [...paymentHistory, newPayment];
        setPaymentHistory(updated);
        updateMonthlyActuals(updated);

        // Auto-fill next month
        try {
            const currentDate = new Date(draftPayment.due_date);
            const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
            const nextDateStr = format(nextMonth, 'yyyy-MM-dd');
            setDraftPayment({ due_date: nextDateStr, amount: draftPayment.amount });
        } catch (e) {
            setDraftPayment({ due_date: '', amount: '' });
        }
    };

    const handleRemovePayment = (id: string) => {
        if (!confirm(t('deletePaymentConfirmation'))) return;
        const updated = paymentHistory.filter(p => p.id !== id);
        setPaymentHistory(updated);
        updateMonthlyActuals(updated);
    };

    const handleExpectedChange = (id: string, field: 'amount' | 'due_date', value: string) => {
        setExpectedHistory(prev => prev.map(p => {
            if (p.id === id) {
                if (field === 'amount') return { ...p, amount: parseFloat(value) || 0 };
                if (field === 'due_date') return { ...p, due_date: value };
            }
            return p;
        }));
    };

    const handleAddExpected = () => {
        if (!draftExpected.due_date || !draftExpected.amount) {
            alert(t('fillAllFields'));
            return;
        }

        const newPayment = {
            id: `manual-exp-${Date.now()}`,
            due_date: draftExpected.due_date,
            amount: parseFloat(draftExpected.amount) || 0
        };
        setExpectedHistory(prev => [...prev, newPayment]);

        // Auto-fill next month
        try {
            const currentDate = new Date(draftExpected.due_date);
            const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
            const nextDateStr = format(nextMonth, 'yyyy-MM-dd');
            setDraftExpected({ due_date: nextDateStr, amount: draftExpected.amount });
        } catch (e) {
            setDraftExpected({ due_date: '', amount: '' });
        }
    };

    const handleRemoveExpected = (id: string) => {
        if (!confirm(t('deleteExpectedConfirmation'))) return;
        setExpectedHistory(prev => prev.filter(p => p.id !== id));
    };

    const handleLoadContract = async (contractId: string) => {
        if (!contractId) return;
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: contract } = await supabase
                .from('contracts')
                .select('*, properties(address), tenants(name)')
                .eq('id', contractId)
                .eq('user_id', user.id) // Enforce ownership
                .single();

            if (contract) {
                setRecBaseRent(contract.base_rent.toString());
                setRecLinkageType(contract.linkage_type);
                setContractStartDate(contract.base_index_date || contract.start_date);
                setPeriodStart(contract.start_date);
                const end = contract.end_date || new Date().toISOString().split('T')[0];
                setPeriodEnd(end);

                // Generate Expected
                const months = [];
                const startDate = new Date(contract.start_date);
                const endDate = new Date(end);
                const tempDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
                const lastDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

                while (tempDate <= lastDate) {
                    const year = tempDate.getFullYear();
                    const month = String(tempDate.getMonth() + 1).padStart(2, '0');
                    months.push(`${year}-${month}`);
                    tempDate.setMonth(tempDate.getMonth() + 1);
                }

                const expected = months.map((m, i) => ({
                    id: `expected-${i}`,
                    due_date: `${m}-${String(startDate.getDate()).padStart(2, '0')}`,
                    amount: contract.base_rent
                }));
                setExpectedHistory(expected);

                // Fetch Actuals
                const { data: payments } = await supabase
                    .from('payments')
                    .select('id, amount, due_date, status')
                    .eq('contract_id', contract.id)
                    .eq('user_id', user.id) // Enforce ownership
                    .eq('status', 'paid')
                    .order('due_date', { ascending: true });

                if (payments) {
                    setPaymentHistory(payments);
                    updateMonthlyActuals(payments);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCalculate = async () => {
        setLoading(true);
        try {
            const monthlyBaseRent: Record<string, number> = {};
            if (expectedHistory.length > 0) {
                expectedHistory.forEach(p => {
                    const month = p.due_date.slice(0, 7);
                    monthlyBaseRent[month] = (monthlyBaseRent[month] || 0) + p.amount;
                });
            }

            const res = await calculateReconciliation({
                baseRent: parseFloat(recBaseRent),
                linkageType: recLinkageType,
                contractStartDate: contractStartDate.slice(0, 7),
                periodStart: periodStart.slice(0, 7),
                periodEnd: periodEnd.slice(0, 7),
                actualPaidPerMonth: parseFloat(actualPaid),
                monthlyActuals: monthlyActuals || undefined,
                partialLinkage: parseFloat(recPartialLinkage),
                linkageSubType: recLinkageSubType,
                updateFrequency: recUpdateFrequency,
                isIndexBaseMinimum: recIndexBaseMinimum,
                maxIncreasePercentage: recMaxIncrease ? parseFloat(recMaxIncrease) : undefined,
                monthlyBaseRent: Object.keys(monthlyBaseRent).length > 0 ? monthlyBaseRent : undefined
            });
            setResult(res);
        } catch (error) {
            console.error('Calculation error:', error);
            alert(error instanceof Error ? error.message : t('calculationFailed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Contract Loading */}
            <div className="bg-slate-50 dark:bg-neutral-800/30 p-8 rounded-[2.5rem] border border-slate-100/50 dark:border-neutral-800/50">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-4 block ml-1">
                    {t('loadFromContract')}
                </label>
                <select
                    className="w-full h-16 px-6 bg-white dark:bg-neutral-900 border-2 border-transparent focus:border-primary rounded-[1.25rem] text-sm font-black text-foreground outline-none shadow-minimal transition-all appearance-none"
                    onChange={(e) => handleLoadContract(e.target.value)}
                    defaultValue=""
                >
                    <option value="" disabled>{t('selectContractPlaceholder')}</option>
                    {contracts.map(c => (
                        <option key={c.id} value={c.id}>
                            {c.properties?.address} - {c.tenants?.name}
                        </option>
                    ))}
                </select>
            </div>

            <section className="bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 rounded-[3rem] p-10 md:p-14 shadow-premium space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                    {/* Left Column: Payments History */}
                    <div className="space-y-12">
                        {/* Expected Base Rent */}
                        <div className="space-y-6">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground block">{t('expectedBaseRent')}</label>
                                <button
                                    onClick={() => {
                                        if (expectedHistory.length === 0 && periodStart && periodEnd) {
                                            const months = [];
                                            const startDate = new Date(periodStart);
                                            const endDate = new Date(periodEnd);
                                            const tempDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
                                            const lastDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

                                            while (tempDate <= lastDate) {
                                                const year = tempDate.getFullYear();
                                                const month = String(tempDate.getMonth() + 1).padStart(2, '0');
                                                months.push(`${year}-${month}`);
                                                tempDate.setMonth(tempDate.getMonth() + 1);
                                            }
                                            const expected = months.map((m, i) => ({
                                                id: `gen-${i}`,
                                                due_date: `${m}-${String(startDate.getDate()).padStart(2, '0')}`,
                                                amount: parseFloat(recBaseRent) || 0
                                            }));
                                            setExpectedHistory(expected);
                                        } else if (expectedHistory.length > 0) {
                                            if (confirm('Clear expected payment list?')) setExpectedHistory([]);
                                        }
                                    }}
                                    className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-80 transition-opacity"
                                >
                                    {expectedHistory.length > 0 ? t('clearList') : t('generateList')}
                                </button>
                            </div>
                            <div className="border border-slate-100 dark:border-neutral-800 rounded-[2rem] overflow-hidden bg-slate-50/50 dark:bg-neutral-800/30">
                                <div className="bg-white dark:bg-neutral-900/50 p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground grid grid-cols-12 gap-2 px-6 border-b border-slate-100 dark:border-neutral-800">
                                    <span className="col-span-7">{t('date')}</span>
                                    <span className="col-span-4 text-center">{t('amount')}</span>
                                    <span className="col-span-1"></span>
                                </div>
                                <div className="max-h-80 overflow-y-auto scrollbar-thin">
                                    <div className="divide-y divide-slate-100/50 dark:divide-neutral-800/50">
                                        {expectedHistory.map((payment) => (
                                            <div key={payment.id} className="grid grid-cols-12 gap-2 items-center py-3 px-4 text-sm hover:bg-white dark:hover:bg-neutral-800/80 transition-colors group">
                                                <div className="col-span-6">
                                                    <DatePicker
                                                        value={payment.due_date ? parseISO(payment.due_date) : undefined}
                                                        onChange={(date) => handleExpectedChange(payment.id, 'due_date', date ? format(date, 'yyyy-MM-dd') : '')}
                                                        placeholder={t('date')}
                                                        className="w-full bg-transparent border-none shadow-none focus:ring-0 font-bold"
                                                    />
                                                </div>
                                                <div className="col-span-5 relative">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-sm">₪</span>
                                                    <input
                                                        type="number"
                                                        value={payment.amount}
                                                        onChange={(e) => handleExpectedChange(payment.id, 'amount', e.target.value)}
                                                        className="w-full p-2 pl-6 bg-transparent border-transparent hover:bg-white dark:hover:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-700 border rounded-xl text-center font-black text-foreground outline-none transition-all"
                                                    />
                                                </div>
                                                <div className="col-span-1 flex justify-end">
                                                    <button onClick={() => handleRemoveExpected(payment.id)} className="text-slate-300 hover:text-red-500 transition-all p-2">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {/* Draft */}
                                        <div className="grid grid-cols-12 gap-2 items-center py-4 px-4 text-sm bg-white/40 dark:bg-neutral-900/40">
                                            <div className="col-span-6">
                                                <DatePicker
                                                    value={draftExpected.due_date ? parseISO(draftExpected.due_date) : undefined}
                                                    onChange={(date) => setDraftExpected({ ...draftExpected, due_date: date ? format(date, 'yyyy-MM-dd') : '' })}
                                                    placeholder={t('date')}
                                                    className="w-full bg-transparent border-none shadow-none"
                                                />
                                            </div>
                                            <div className="col-span-5 relative">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xs">₪</span>
                                                <input
                                                    type="number"
                                                    value={draftExpected.amount}
                                                    onChange={(e) => setDraftExpected({ ...draftExpected, amount: e.target.value })}
                                                    placeholder="0"
                                                    className="w-full p-2 pl-6 bg-white dark:bg-neutral-800 border-2 border-slate-100 dark:border-neutral-700 rounded-xl text-center font-bold text-foreground outline-none"
                                                />
                                            </div>
                                            <div className="col-span-1 flex justify-end">
                                                <button
                                                    onClick={handleAddExpected}
                                                    disabled={!draftExpected.due_date || !draftExpected.amount}
                                                    className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center hover:scale-110 disabled:opacity-10 transition-all shadow-minimal"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-neutral-900/50 p-6 border-t border-slate-100 dark:border-neutral-800 flex justify-end items-center">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{t('totalExpected')}</span>
                                        <span className="text-2xl font-black text-foreground">₪{expectedHistory.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actual Payments */}
                        <div className="space-y-6">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground block ml-1">{t('actualPayments')}</label>
                            <div className="border border-slate-100 dark:border-neutral-800 rounded-[2rem] overflow-hidden bg-slate-50/50 dark:bg-neutral-800/30">
                                <div className="bg-white dark:bg-neutral-900/50 p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground grid grid-cols-12 gap-2 px-6 border-b border-slate-100 dark:border-neutral-800">
                                    <span className="col-span-7">{t('date')}</span>
                                    <span className="col-span-4 text-center">{t('amount')}</span>
                                    <span className="col-span-1"></span>
                                </div>
                                <div className="max-h-80 overflow-y-auto scrollbar-thin">
                                    <div className="divide-y divide-slate-100/50 dark:divide-neutral-800/50">
                                        {paymentHistory.map((payment) => (
                                            <div key={payment.id} className="grid grid-cols-12 gap-2 items-center py-3 px-4 text-sm hover:bg-white dark:hover:bg-neutral-800/80 transition-colors group">
                                                <div className="col-span-6">
                                                    <DatePicker
                                                        value={payment.due_date ? parseISO(payment.due_date) : undefined}
                                                        onChange={(date) => handlePaymentChange(payment.id, 'due_date', date ? format(date, 'yyyy-MM-dd') : '')}
                                                        placeholder={t('date')}
                                                        className="w-full bg-transparent border-none shadow-none focus:ring-0 font-bold"
                                                    />
                                                </div>
                                                <div className="col-span-5 relative">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-sm">₪</span>
                                                    <input
                                                        type="number"
                                                        value={payment.amount}
                                                        onChange={(e) => handlePaymentChange(payment.id, 'amount', e.target.value)}
                                                        className="w-full p-2 pl-6 bg-transparent border-transparent hover:bg-white dark:hover:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-700 border rounded-xl text-center font-black text-foreground outline-none transition-all"
                                                    />
                                                </div>
                                                <div className="col-span-1 flex justify-end">
                                                    <button onClick={() => handleRemovePayment(payment.id)} className="text-slate-300 hover:text-red-500 transition-all p-2">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {/* Draft */}
                                        <div className="grid grid-cols-12 gap-2 items-center py-4 px-4 text-sm bg-white/40 dark:bg-neutral-900/40">
                                            <div className="col-span-6">
                                                <DatePicker
                                                    value={draftPayment.due_date ? parseISO(draftPayment.due_date) : undefined}
                                                    onChange={(date) => setDraftPayment({ ...draftPayment, due_date: date ? format(date, 'yyyy-MM-dd') : '' })}
                                                    placeholder={t('date')}
                                                    className="w-full bg-transparent border-none shadow-none"
                                                />
                                            </div>
                                            <div className="col-span-5 relative">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xs">₪</span>
                                                <input
                                                    type="number"
                                                    value={draftPayment.amount}
                                                    onChange={(e) => setDraftPayment({ ...draftPayment, amount: e.target.value })}
                                                    placeholder="0"
                                                    className="w-full p-2 pl-6 bg-white dark:bg-neutral-800 border-2 border-slate-100 dark:border-neutral-700 rounded-xl text-center font-bold text-foreground outline-none"
                                                />
                                            </div>
                                            <div className="col-span-1 flex justify-end">
                                                <button
                                                    onClick={handleAddPayment}
                                                    disabled={!draftPayment.due_date || !draftPayment.amount}
                                                    className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center hover:scale-110 disabled:opacity-10 transition-all shadow-minimal"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-neutral-900/50 p-6 border-t border-slate-100 dark:border-neutral-800 flex justify-end items-center">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{t('totalActual')}</span>
                                        <span className="text-2xl font-black text-foreground">₪{paymentHistory.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Configuration */}
                    <div className="space-y-10">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground block ml-1">{t('linkageType')}</label>
                            <select
                                value={recLinkageType}
                                onChange={(e) => setRecLinkageType(e.target.value as any)}
                                className="w-full h-16 px-6 bg-slate-50 dark:bg-neutral-800/50 border-2 border-transparent focus:bg-white dark:focus:bg-neutral-800 focus:border-primary rounded-[1.25rem] font-black text-sm text-foreground transition-all outline-none appearance-none"
                            >
                                <option value="cpi">{t('cpi')}</option>
                                <option value="housing">{t('housingServices')}</option>
                                <option value="construction">{t('constructionInputs')}</option>
                                <option value="usd">{t('usdRate')}</option>
                                <option value="eur">{t('eurRate')}</option>
                            </select>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground block ml-1">{t('baseIndexDate')}</label>
                            <DatePicker
                                value={contractStartDate ? parseISO(contractStartDate) : undefined}
                                onChange={(date) => setContractStartDate(date ? format(date, 'yyyy-MM-dd') : '')}
                                placeholder={t('baseIndexDate')}
                                className="w-full h-16 rounded-[1.25rem] bg-slate-50 dark:bg-neutral-800/50 border-none font-bold"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground block ml-1">{t('periodStart')}</label>
                                <DatePicker
                                    value={periodStart ? parseISO(periodStart) : undefined}
                                    onChange={(date) => setPeriodStart(date ? format(date, 'yyyy-MM-dd') : '')}
                                    placeholder={t('periodStart')}
                                    className="w-full h-16 rounded-[1.25rem] bg-slate-50 dark:bg-neutral-800/50 border-none font-bold"
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground block ml-1">{t('periodEnd')}</label>
                                <DatePicker
                                    value={periodEnd ? parseISO(periodEnd) : undefined}
                                    onChange={(date) => setPeriodEnd(date ? format(date, 'yyyy-MM-dd') : '')}
                                    placeholder={t('periodEnd')}
                                    className="w-full h-16 rounded-[1.25rem] bg-slate-50 dark:bg-neutral-800/50 border-none font-bold"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <button
                                onClick={() => setShowRecAdvanced(!showRecAdvanced)}
                                className="flex items-center gap-2 self-start text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all px-1"
                            >
                                {showRecAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                {t('advancedReconciliationOptions')}
                            </button>

                            {showRecAdvanced && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="space-y-8 p-10 rounded-[2.5rem] bg-slate-50 dark:bg-neutral-800/50 border border-slate-100 dark:border-neutral-800 mt-2"
                                >
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground block ml-1">{t('linkageCalculationMethod')}</label>
                                        <div className="flex gap-4 p-1.5 bg-white dark:bg-neutral-900 rounded-2xl border border-slate-100 dark:border-neutral-800">
                                            {(['known', 'respect_of'] as const).map((subType) => (
                                                <button
                                                    key={subType}
                                                    onClick={() => setRecLinkageSubType(subType)}
                                                    className={cn(
                                                        "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                        recLinkageSubType === subType
                                                            ? "bg-slate-100 dark:bg-neutral-800 text-foreground"
                                                            : "text-muted-foreground hover:text-foreground"
                                                    )}
                                                >
                                                    {t(subType === 'known' ? 'knownIndex' : 'inRespectOf')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground block ml-1">{t('updateFrequency')}</label>
                                        <select
                                            value={recUpdateFrequency}
                                            onChange={(e) => setRecUpdateFrequency(e.target.value as any)}
                                            className="w-full h-14 px-6 bg-white dark:bg-neutral-900 border-2 border-transparent focus:border-primary rounded-[1.25rem] text-xs font-black text-foreground outline-none transition-all appearance-none"
                                        >
                                            <option value="monthly">{t('everyMonth')}</option>
                                            <option value="quarterly">{t('quarterly')}</option>
                                            <option value="semiannually">{t('semiannually')}</option>
                                            <option value="annually">{t('annually')}</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground block ml-1">{t('linkageFloor')}</label>
                                            <div
                                                onClick={() => setRecIndexBaseMinimum(!recIndexBaseMinimum)}
                                                className="flex items-center gap-3 cursor-pointer group"
                                            >
                                                <div className={cn(
                                                    "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                                    recIndexBaseMinimum ? "bg-primary border-primary" : "bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-700"
                                                )}>
                                                    {recIndexBaseMinimum && <Plus className="w-4 h-4 text-white rotate-45" />}
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground">
                                                    {t('indexBaseMin')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground block ml-1">{t('maxIncrease')}</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={recMaxIncrease}
                                                    onChange={(e) => setRecMaxIncrease(e.target.value)}
                                                    className="w-full h-14 px-6 pr-10 bg-white dark:bg-neutral-900 border-2 border-transparent focus:border-primary rounded-[1.25rem] text-xs font-black text-foreground outline-none transition-all"
                                                    placeholder="5"
                                                />
                                                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-bold">%</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleCalculate}
                    disabled={loading || !recBaseRent || !contractStartDate || !periodStart || !periodEnd}
                    className="w-full h-24 bg-foreground text-background rounded-[2rem] font-black text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-premium-dark disabled:opacity-20 flex items-center justify-center gap-4 group"
                >
                    {loading ? t('calculating') : t('calculateBackPay')}
                    {!loading && <TrendingUp className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                </button>
            </section>

            {/* Reconciliation Results */}
            {result && (
                <section className="bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 rounded-[3rem] p-10 md:p-14 shadow-premium space-y-10 animate-in zoom-in-95 duration-700">
                    <h3 className="font-black text-[10px] uppercase tracking-[0.4em] text-muted-foreground text-center">{t('paymentReconciliationResults')}</h3>

                    <div className="bg-red-50 dark:bg-red-950/20 p-12 rounded-[2.5rem] border border-red-100 dark:border-red-900/30 text-center space-y-3">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400 block">{t('totalBackPayOwed')}</span>
                        <span className="text-6xl font-black text-red-600 dark:text-red-400">₪{result.totalBackPayOwed.toLocaleString()}</span>
                        <p className="text-xs font-bold text-red-300 dark:text-red-800 uppercase tracking-widest pt-2">
                            {result.totalMonths} {t('months')} {t('totalBase').toLowerCase()}
                        </p>
                    </div>

                    <div className="space-y-6">
                        <button
                            onClick={() => setShowBreakdown(!showBreakdown)}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all px-2"
                        >
                            {showBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            {t('monthlyBreakdown')}
                        </button>

                        {showBreakdown && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="border border-slate-100 dark:border-neutral-800 rounded-[2.5rem] overflow-hidden bg-white dark:bg-neutral-900 shadow-premium"
                            >
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-neutral-800/80 border-b border-slate-100 dark:border-neutral-800">
                                                <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('month')}</th>
                                                <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('shouldPay')}</th>
                                                <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('paid')}</th>
                                                <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('gap')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-neutral-800">
                                            {result.monthlyBreakdown.map((month) => (
                                                <tr key={month.month} className="hover:bg-slate-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                                                    <td className="p-6 font-black text-xs uppercase tracking-tight">
                                                        {month.month.split('-').reverse().join('/') || t('now')}
                                                    </td>
                                                    <td className="p-6 text-right font-black">₪{month.shouldHavePaid.toLocaleString()}</td>
                                                    <td className="p-6 text-right font-bold text-muted-foreground/60">₪{month.actuallyPaid.toLocaleString()}</td>
                                                    <td className={cn("p-6 text-right font-black", month.difference > 0 ? "text-red-500" : "text-emerald-500")}>
                                                        {month.difference > 0 ? '+' : ''}₪{month.difference.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    <button
                        onClick={() => setIsGeneratorOpen(true)}
                        className="w-full h-20 bg-foreground text-background py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all hover:scale-[1.01] flex items-center justify-center gap-4 shadow-premium-dark"
                    >
                        <Share2 className="w-5 h-5" />
                        {t('shareResult')}
                    </button>
                </section>
            )}

            <MessageGeneratorModal
                isOpen={isGeneratorOpen}
                onClose={() => setIsGeneratorOpen(false)}
                calculationData={{
                    input: {
                        type: 'reconciliation',
                        baseRent: expectedHistory[0]?.amount || '',
                        linkageType: recLinkageType,
                        periodStart,
                        periodEnd,
                        expectedHistory,
                        actualPayments: paymentHistory
                    },
                    result
                }}
            />
        </div>
    );
}
