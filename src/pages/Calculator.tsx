import { Calculator as CalcIcon, TrendingUp, ChevronDown, ChevronUp, Share2, Trash2, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { calculateStandard, calculateReconciliation } from '../services/calculator.service';
import { format, parseISO } from 'date-fns';
import { DatePicker } from '../components/ui/DatePicker';
import type { StandardCalculationResult, ReconciliationResult } from '../types/database';
import { MessageGeneratorModal } from '../components/modals/MessageGeneratorModal';
import logoFinalCleanV2 from '../assets/rentmate-icon-only.png';
import { UrlCompression } from '../lib/url-compression';

type TabType = 'standard' | 'reconciliation';

export function Calculator({ embedMode = false }: { embedMode?: boolean }) {
    const location = useLocation();
    const { lang, t } = useTranslation();
    const { preferences } = useUserPreferences();
    const [activeTab, setActiveTab] = useState<TabType>('standard');
    const [loading, setLoading] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);

    // Standard Mode State
    const [baseRent, setBaseRent] = useState('5000');
    const [linkageType, setLinkageType] = useState<'cpi' | 'housing' | 'construction' | 'usd' | 'eur'>('cpi');
    const [baseDate, setBaseDate] = useState('');
    const [targetDate, setTargetDate] = useState('');
    const [standardResult, setStandardResult] = useState<StandardCalculationResult | null>(null);
    const [indexBaseMinimum, setIndexBaseMinimum] = useState<boolean>(false);

    // Reconciliation Mode State
    const [recBaseRent, setRecBaseRent] = useState('5000');
    const [recLinkageType, setRecLinkageType] = useState<'cpi' | 'housing' | 'construction' | 'usd' | 'eur'>('cpi');
    const [contractStartDate, setContractStartDate] = useState('');
    const [periodStart, setPeriodStart] = useState('');
    const [periodEnd, setPeriodEnd] = useState('');
    const [actualPaid, setActualPaid] = useState('5000');
    const [recPartialLinkage] = useState('100');
    const [reconciliationResult, setReconciliationResult] = useState<ReconciliationResult | null>(null);
    const [recLinkagePercentage, setRecLinkagePercentage] = useState('100');

    const [showBreakdown, setShowBreakdown] = useState(false);
    const [isSharedCalculation, setIsSharedCalculation] = useState(false);
    const [shouldAutoCalculate, setShouldAutoCalculate] = useState(false);

    // Decode shared calculation from URL
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const shareParam = params.get('share');

        if (shareParam) {
            const data = UrlCompression.decompress(shareParam);

            if (data) {
                setIsSharedCalculation(true);

                // Determine which tab based on calculation type
                const calcType = data.input.type || 'standard';
                setActiveTab(calcType);

                if (calcType === 'standard') {
                    // Pre-fill standard calculation
                    if (data.input.baseRent) setBaseRent(data.input.baseRent.toString());
                    if (data.input.linkageType) setLinkageType(data.input.linkageType);
                    if (data.input.baseDate) setBaseDate(data.input.baseDate);
                    if (data.input.targetDate) setTargetDate(data.input.targetDate);
                    if (data.input.isIndexBaseMinimum !== undefined) setIndexBaseMinimum(data.input.isIndexBaseMinimum);

                    if (data.result) {
                        setStandardResult(data.result);
                    } else {
                        setShouldAutoCalculate(true);
                    }
                } else if (calcType === 'reconciliation') {
                    // Pre-fill reconciliation calculation
                    if (data.input.baseRent) setRecBaseRent(data.input.baseRent.toString());
                    if (data.input.linkageType) setRecLinkageType(data.input.linkageType);
                    if (data.input.contractStartDate) setContractStartDate(data.input.contractStartDate);
                    if (data.input.periodStart) setPeriodStart(data.input.periodStart);
                    if (data.input.periodEnd) setPeriodEnd(data.input.periodEnd);
                    if (data.input.actualPaid) setActualPaid(data.input.actualPaid.toString());

                    // Restore Advanced Options
                    if (data.input.linkageSubType) setRecLinkageSubType(data.input.linkageSubType);
                    if (data.input.updateFrequency) setRecUpdateFrequency(data.input.updateFrequency);
                    if (data.input.recIndexBaseMinimum !== undefined) setRecIndexBaseMinimum(data.input.recIndexBaseMinimum);
                    if (data.input.maxIncreasePercentage) setRecMaxIncrease(data.input.maxIncreasePercentage.toString());

                    if (data.result) {
                        setReconciliationResult(data.result);
                        setShowBreakdown(true);
                    } else {
                        setShouldAutoCalculate(true);
                    }
                }
            }
        }
    }, [location.search]);

    // Auto-Calculate Effect (for shared links without results)
    useEffect(() => {
        if (shouldAutoCalculate) {
            const timer = setTimeout(() => {
                if (activeTab === 'standard') {
                    handleStandardCalculate();
                } else {
                    handleReconciliationCalculate();
                    setShowBreakdown(true);
                }
                setShouldAutoCalculate(false);
            }, 500); // Small delay to ensure state updates propagate
            return () => clearTimeout(timer);
        }
    }, [shouldAutoCalculate, activeTab]);

    // Initial load from navigation state
    useEffect(() => {
        if (location.state?.contractData) {
            const data = location.state.contractData;
            // Pre-fill Standard Tab
            if (data.baseRent) setBaseRent(data.baseRent.toString());
            if (data.linkageType) setLinkageType(data.linkageType);
            if (data.baseIndexDate) setBaseDate(data.baseIndexDate);

            // Pre-fill Rec Tab (if they switch to it)
            if (data.baseRent) setRecBaseRent(data.baseRent.toString());
            if (data.linkageType) setRecLinkageType(data.linkageType);
            if (data.baseIndexDate) setContractStartDate(data.baseIndexDate);
            if (data.startDate) setPeriodStart(data.startDate);
            // Default target/end dates to now if not passed
            const now = new Date().toISOString().split('T')[0];
            setTargetDate(now);
            setPeriodEnd(now);
        }
    }, [location.state]);

    // Smart Mode State
    const [contracts, setContracts] = useState<any[]>([]);
    const [monthlyActuals, setMonthlyActuals] = useState<Record<string, number> | null>(null);
    const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
    const [expectedHistory, setExpectedHistory] = useState<any[]>([]);

    // Advanced Reconciliation State
    const [recLinkageSubType, setRecLinkageSubType] = useState<'known' | 'respect_of'>('known');
    const [recUpdateFrequency, setRecUpdateFrequency] = useState<'monthly' | 'quarterly' | 'semiannually' | 'annually'>('monthly');
    const [recIndexBaseMinimum, setRecIndexBaseMinimum] = useState<boolean>(true);
    const [recMaxIncrease, setRecMaxIncrease] = useState<string>('');
    const [showRecAdvanced, setShowRecAdvanced] = useState(false);
    // Draft states for manual additions
    const [draftExpected, setDraftExpected] = useState<{ due_date: string; amount: string }>({ due_date: '', amount: '' });
    const [draftPayment, setDraftPayment] = useState<{ due_date: string; amount: string }>({ due_date: '', amount: '' });

    // Fetch contracts for dropdown
    useEffect(() => {
        if (activeTab === 'reconciliation') {
            const fetchContracts = async () => {
                const { data, error } = await supabase
                    .from('contracts')
                    .select(`
                        id, 
                        base_rent, 
                        linkage_type, 
                        start_date, 
                        base_index_date, 
                        properties (address), 
                        tenants (name)
                    `);

                if (error) console.error('Error fetching contracts:', error);
                if (data) setContracts(data);
            };
            fetchContracts();
        }
    }, [activeTab]);

    const updateMonthlyActuals = (payments: any[]) => {
        const actualsMap: Record<string, number> = {};
        payments.forEach(p => {
            const month = p.due_date.slice(0, 7);
            actualsMap[month] = (actualsMap[month] || 0) + p.amount;
        });
        setMonthlyActuals(actualsMap);
    };

    const handlePaymentChange = (id: string, field: 'amount' | 'due_date', value: string) => {
        const updatedHistory = paymentHistory.map(p => {
            if (p.id === id) {
                if (field === 'amount') return { ...p, amount: parseFloat(value) || 0 };
                if (field === 'due_date') return { ...p, due_date: value };
            }
            return p;
        });
        setPaymentHistory(updatedHistory);
        updateMonthlyActuals(updatedHistory);
    };

    const handleAddPayment = () => {
        if (!draftPayment.due_date || !draftPayment.amount) return;

        const newPayment = {
            id: `manual-${Date.now()}`,
            due_date: draftPayment.due_date,
            amount: parseFloat(draftPayment.amount) || 0,
            status: 'manual'
        };
        const updatedHistory = [...paymentHistory, newPayment];
        setPaymentHistory(updatedHistory);
        updateMonthlyActuals(updatedHistory);
        setDraftPayment({ due_date: '', amount: '' });
    };

    const handleRemovePayment = (id: string) => {
        if (!confirm(t('deletePaymentConfirmation'))) return;
        const updatedHistory = paymentHistory.filter(p => p.id !== id);
        setPaymentHistory(updatedHistory);
        updateMonthlyActuals(updatedHistory);
    };

    const handleStandardCalculate = async () => {
        setLoading(true);
        try {
            const result = await calculateStandard({
                baseRent: parseFloat(baseRent),
                linkageType,
                baseDate: baseDate.slice(0, 7),
                targetDate: targetDate.slice(0, 7),
                partialLinkage: 100,
                isIndexBaseMinimum: indexBaseMinimum
            });
            setStandardResult(result);
        } catch (error) {
            console.error('Calculation error:', error);
            alert(t('calculationFailed'));
        } finally {
            setLoading(false);
        }
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
        if (!draftExpected.due_date || !draftExpected.amount) return;

        const newPayment = {
            id: `manual-exp-${Date.now()}`,
            due_date: draftExpected.due_date,
            amount: parseFloat(draftExpected.amount) || 0
        };
        setExpectedHistory(prev => [...prev, newPayment]);
        setDraftExpected({ due_date: '', amount: '' });
    };

    const handleRemoveExpected = (id: string) => {
        if (!confirm(t('deleteExpectedConfirmation'))) return;
        setExpectedHistory(prev => prev.filter(p => p.id !== id));
    };

    const handleReconciliationCalculate = async () => {
        setLoading(true);
        try {
            // Prepare monthlyBaseRent map
            const monthlyBaseRent: Record<string, number> = {};
            if (expectedHistory.length > 0) {
                expectedHistory.forEach(p => {
                    const month = p.due_date.slice(0, 7);
                    // If multiple payments in same month, sum them? Or assume one base rent?
                    // Usually base rent is a monthly figure. If user adds partials, we might sum.
                    monthlyBaseRent[month] = (monthlyBaseRent[month] || 0) + p.amount;
                });
            }

            const result = await calculateReconciliation({
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
            setReconciliationResult(result);
        } catch (error) {
            console.error('Calculation error:', error);
            alert(error instanceof Error ? error.message : t('calculationFailed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Shared Calculation Banner */}
            {isSharedCalculation && (
                <div className="bg-primary/10 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center gap-3">
                    <Share2 className="w-5 h-5 text-primary dark:text-blue-400 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            {t('viewingSharedCalculation')}
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                            {t('sharedCalculationDesc')}
                        </p>
                    </div>
                </div>
            )}

            {/* Header - Only check if NOT in embed mode */}
            {!embedMode && (
                <div className="flex items-center justify-between relative h-24 mb-8">
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter text-black dark:text-white uppercase">{t('calculator')}</h1>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">{t('calculateLinkageAndMore')}</p>
                    </div>

                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-10 dark:opacity-20">
                        <img src={logoFinalCleanV2} alt="RentMate" className="h-16 w-auto object-contain" />
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 bg-gray-50 dark:bg-neutral-800 p-1.5 rounded-[1.25rem] border border-gray-100 dark:border-neutral-800">
                <button
                    onClick={() => setActiveTab('standard')}
                    className={cn(
                        "flex-1 py-3 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95",
                        activeTab === 'standard'
                            ? "bg-black dark:bg-white text-white dark:text-black shadow-lg"
                            : "text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
                    )}
                >
                    {t('standardCalculation')}
                </button>
                <button
                    onClick={() => setActiveTab('reconciliation')}
                    className={cn(
                        "flex-1 py-3 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95",
                        activeTab === 'reconciliation'
                            ? "bg-black dark:bg-white text-white dark:text-black shadow-lg"
                            : "text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
                    )}
                >
                    {t('paymentReconciliation')}
                </button>
            </div>

            {/* Contract Selection (Global for Reco) */}
            {
                activeTab === 'reconciliation' && (
                    <div className="bg-gray-50 dark:bg-neutral-800/50 p-6 rounded-[2rem] border border-gray-100 dark:border-neutral-800">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 block">
                            {t('loadFromContract')}
                        </label>
                        <select
                            className="w-full p-4 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-700 rounded-2xl text-sm font-bold text-black dark:text-white outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all appearance-none"
                            onChange={async (e) => {
                                // ... existing logic remains same ...
                                if (!e.target.value) return;
                                setLoading(true);
                                try {
                                    // Fetch Contract
                                    const { data: contract } = await supabase
                                        .from('contracts')
                                        .select('*, properties(address), tenants(name)')
                                        .eq('id', e.target.value)
                                        .single();

                                    if (contract) {
                                        setRecBaseRent(contract.base_rent.toString());
                                        setRecLinkageType(contract.linkage_type);
                                        setContractStartDate(contract.base_index_date || contract.start_date);
                                        setPeriodStart(contract.start_date);
                                        setPeriodStart(contract.start_date);
                                        const end = contract.end_date || new Date().toISOString().split('T')[0];
                                        setPeriodEnd(end);

                                        // Generate Expected History based on contract
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
                                            due_date: `${m}-${String(startDate.getDate()).padStart(2, '0')}`, // Preserve day
                                            amount: contract.base_rent
                                        }));
                                        setExpectedHistory(expected);

                                        // Fetch Paid Payments
                                        const { data: payments } = await supabase
                                            .from('payments')
                                            .select('id, amount, due_date, status')
                                            .eq('contract_id', contract.id)
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
                            }}
                        >
                            <option value="">{t('selectContractPlaceholder')}</option>
                            {contracts.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.properties?.address} - {c.tenants?.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )
            }

            {/* Helper to update derived monthly actuals */}
            {/* We'll define the function outside but since we are in render body we can just use a const function */}
            {/* Actually better to define it inside the component body, let's just insert it before the return */}


            {/* Standard Calculation Tab */}
            {
                activeTab === 'standard' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-[2.5rem] p-8 md:p-12 shadow-2xl space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block ml-1">{t('baseRent')}</label>
                                    <input
                                        type="number"
                                        value={baseRent}
                                        onChange={(e) => setBaseRent(e.target.value)}
                                        className="w-full p-4 bg-gray-50 dark:bg-neutral-800 border-transparent focus:bg-white dark:focus:bg-neutral-700 border focus:border-black dark:focus:border-white rounded-2xl font-black text-xl text-black dark:text-white transition-all outline-none"
                                        placeholder="5000"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block ml-1">{t('linkageType')}</label>
                                    <select
                                        value={linkageType}
                                        onChange={(e) => setLinkageType(e.target.value as any)}
                                        className="w-full p-4 bg-gray-50 dark:bg-neutral-800 border-transparent focus:bg-white dark:focus:bg-neutral-700 border focus:border-black dark:focus:border-white rounded-2xl font-bold text-black dark:text-white transition-all outline-none appearance-none"
                                    >
                                        <option value="cpi">{t('cpi')}</option>
                                        <option value="housing">{t('housingServices')}</option>
                                        <option value="construction">{t('constructionInputs')}</option>
                                        <option value="usd">{t('usdRate')}</option>
                                        <option value="eur">{t('eurRate')}</option>
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block ml-1">{t('baseDate')}</label>
                                    <DatePicker
                                        value={baseDate ? parseISO(baseDate) : undefined}
                                        onChange={(date) => setBaseDate(date ? format(date, 'yyyy-MM-dd') : '')}
                                        placeholder={lang === 'he' && preferences.gender === 'female' ? 'בחרי תאריך בסיס' : t('selectBaseDate')}
                                        className="w-full"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block ml-1">{t('targetDate')}</label>
                                    <DatePicker
                                        value={targetDate ? parseISO(targetDate) : undefined}
                                        onChange={(date) => setTargetDate(date ? format(date, 'yyyy-MM-dd') : '')}
                                        placeholder={lang === 'he' && preferences.gender === 'female' ? 'בחרי תאריך יעד' : t('selectTargetDate')}
                                        minDate={baseDate ? parseISO(baseDate) : undefined}
                                        className="w-full"
                                    />
                                </div>
                            </div>

                            {/* Advanced Options */}
                            <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-all"
                            >
                                {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                {t('advancedOptions')}
                            </button>

                            {showAdvanced && (
                                <div className="space-y-3 pt-2 border-t border-border">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={indexBaseMinimum}
                                            onChange={(e) => setIndexBaseMinimum(e.target.checked)}
                                            className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
                                        />
                                        <span className="text-sm font-medium">
                                            {t('indexBaseMin')}
                                        </span>
                                    </label>
                                    <p className="text-xs text-muted-foreground">
                                        {t('indexBaseMinHelp')}
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={handleStandardCalculate}
                                disabled={loading || !baseRent || !baseDate || !targetDate}
                                className="w-full bg-black dark:bg-white text-white dark:text-black py-5 rounded-[1.5rem] font-black text-lg hover:opacity-90 transition-all active:scale-[0.98] shadow-2xl disabled:opacity-50 flex items-center justify-center gap-3 group"
                            >
                                {loading ? t('calculating') : t('calculate')}
                                <TrendingUp className="w-5 h-5 group-hover:translate-y-[-2px] transition-transform" />
                            </button>
                        </div>

                        {/* Standard Results */}
                        {standardResult && (
                            <div className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-[2.5rem] p-8 md:p-12 shadow-2xl space-y-8 animate-in zoom-in-95 duration-500">
                                <h3 className="font-black text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('results')}</h3>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="bg-gray-50 dark:bg-neutral-800 p-6 rounded-[2rem]">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block mb-2">{t('newRent')}</span>
                                        <span className="text-3xl font-black text-black dark:text-white">₪{standardResult.newRent.toLocaleString()}</span>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-neutral-800 p-6 rounded-[2rem]">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block mb-2">{t('linkageCoefficient')}</span>
                                        <span className="text-3xl font-black text-black dark:text-white">{standardResult.linkageCoefficient.toFixed(2)}%</span>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-neutral-800 p-6 rounded-[2rem]">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block mb-2">{t('change')}</span>
                                        <span className="text-2xl font-black text-black dark:text-white">₪{Math.round(standardResult.absoluteChange).toLocaleString()}</span>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-neutral-800 p-6 rounded-[2rem]">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block mb-2">{t('percentage')}</span>
                                        <span className="text-2xl font-black text-black dark:text-white">{standardResult.percentageChange.toFixed(2)}%</span>
                                    </div>
                                </div>
                                <div className="bg-black dark:bg-white p-6 rounded-[2rem] text-sm group transition-all hover:scale-[1.01]">
                                    <p className="font-black text-[10px] uppercase tracking-widest text-white/50 dark:text-black/50 mb-2">{t('formula')}</p>
                                    <p className="text-white dark:text-black font-medium leading-relaxed">{standardResult.formula}</p>
                                </div>

                                <button
                                    onClick={() => setIsGeneratorOpen(true)}
                                    className="w-full bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 text-black dark:text-white py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest transition-all hover:bg-gray-50 dark:hover:bg-neutral-700 flex items-center justify-center gap-3 shadow-xl"
                                >
                                    <Share2 className="w-5 h-5" />
                                    {t('shareResult')}
                                </button>
                            </div>
                        )}
                    </div>
                )
            }

            <MessageGeneratorModal
                isOpen={isGeneratorOpen}
                onClose={() => setIsGeneratorOpen(false)}
                calculationData={{
                    input: {
                        baseRent,
                        linkageType,
                        baseDate,
                        targetDate
                    },
                    result: standardResult
                }}
            />

            {/* Payment Reconciliation Tab */}
            {
                activeTab === 'reconciliation' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-[2.5rem] p-8 md:p-12 shadow-2xl space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                {/* Left Column: Payments History */}
                                <div className="space-y-8">
                                    {/* Expected Base Rent */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block ml-1">{t('expectedBaseRent')}</label>
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
                                                className="text-xs text-primary hover:underline"
                                            >
                                                {expectedHistory.length > 0 ? 'Clear List' : 'Generate List'}
                                            </button>
                                        </div>
                                        <div className="border border-border rounded-xl overflow-hidden bg-background">
                                            <div className="bg-secondary/30 p-2 text-xs font-medium text-muted-foreground grid grid-cols-12 gap-2 px-4 sticky top-0 z-10">
                                                <span className="col-span-7">{t('date')}</span>
                                                <span className="col-span-4 text-center">{t('amount')}</span>
                                                <span className="col-span-1"></span>
                                            </div>
                                            <div className="max-h-72 overflow-y-auto">
                                                <div className="divide-y divide-gray-50 dark:divide-neutral-800">
                                                    {expectedHistory.map((payment) => (
                                                        <div key={payment.id} className="grid grid-cols-12 gap-2 items-center py-2 px-4 text-sm hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors group">
                                                            <div className="col-span-6">
                                                                <DatePicker
                                                                    value={payment.due_date ? parseISO(payment.due_date) : undefined}
                                                                    onChange={(date) => handleExpectedChange(payment.id, 'due_date', date ? format(date, 'yyyy-MM-dd') : '')}
                                                                    placeholder={t('date')}
                                                                    className="w-full"
                                                                />
                                                            </div>
                                                            <div className="col-span-5 relative">
                                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-xs font-bold">₪</span>
                                                                <input
                                                                    type="number"
                                                                    value={payment.amount}
                                                                    onChange={(e) => handleExpectedChange(payment.id, 'amount', e.target.value)}
                                                                    className="w-full p-2 pl-6 bg-transparent border-transparent hover:border-gray-100 dark:hover:border-neutral-700 focus:border-black dark:focus:border-white border rounded-xl text-center font-black text-black dark:text-white outline-none transition-all"
                                                                />
                                                            </div>
                                                            <div className="col-span-1 flex justify-end">
                                                                <button
                                                                    onClick={() => handleRemoveExpected(payment.id)}
                                                                    className="text-gray-300 hover:text-red-500 transition-all p-2"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {/* Draft Row */}
                                                    <div className="grid grid-cols-12 gap-2 items-center py-3 px-4 text-sm bg-gray-50/50 dark:bg-neutral-800/30">
                                                        <div className="col-span-6">
                                                            <DatePicker
                                                                value={draftExpected.due_date ? parseISO(draftExpected.due_date) : undefined}
                                                                onChange={(date) => setDraftExpected({ ...draftExpected, due_date: date ? format(date, 'yyyy-MM-dd') : '' })}
                                                                placeholder={t('date')}
                                                                className="w-full"
                                                            />
                                                        </div>
                                                        <div className="col-span-5 relative">
                                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-[10px] font-bold">₪</span>
                                                            <input
                                                                type="number"
                                                                value={draftExpected.amount}
                                                                onChange={(e) => setDraftExpected({ ...draftExpected, amount: e.target.value })}
                                                                placeholder="0"
                                                                className="w-full p-2 pl-5 bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 rounded-xl text-center font-bold text-black dark:text-white outline-none"
                                                            />
                                                        </div>
                                                        <div className="col-span-1 flex justify-end">
                                                            <button
                                                                onClick={handleAddExpected}
                                                                disabled={!draftExpected.due_date || !draftExpected.amount}
                                                                className="text-black dark:text-white hover:opacity-70 disabled:opacity-20 transition-all p-2"
                                                                title="Add"
                                                            >
                                                                <Plus className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-neutral-800 p-4 border-t border-gray-100 dark:border-neutral-800 flex justify-end items-center">
                                                <div className="text-xs font-black uppercase tracking-widest text-black dark:text-white">
                                                    {t('totalBase')}: <span className="text-lg ml-2">₪{expectedHistory.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actual Payments */}
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block ml-1">{t('actualPayments')}</label>
                                        <div className="border border-gray-100 dark:border-neutral-800 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900">
                                            <div className="bg-gray-50 dark:bg-neutral-800 p-3 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 grid grid-cols-12 gap-2 px-6 sticky top-0 z-10">
                                                <span className="col-span-6">{t('date')}</span>
                                                <span className="col-span-5 text-center">{t('amount')}</span>
                                                <span className="col-span-1"></span>
                                            </div>
                                            <div className="max-h-72 overflow-y-auto">
                                                <div className="divide-y divide-gray-50 dark:divide-neutral-800">
                                                    {paymentHistory.map((payment) => (
                                                        <div key={payment.id} className="grid grid-cols-12 gap-2 items-center py-2 px-4 text-sm hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors group">
                                                            <div className="col-span-6">
                                                                <DatePicker
                                                                    value={payment.due_date ? parseISO(payment.due_date) : undefined}
                                                                    onChange={(date) => handlePaymentChange(payment.id, 'due_date', date ? format(date, 'yyyy-MM-dd') : '')}
                                                                    placeholder={t('date')}
                                                                    className="w-full"
                                                                />
                                                            </div>
                                                            <div className="col-span-5 relative">
                                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-xs font-bold">₪</span>
                                                                <input
                                                                    type="number"
                                                                    value={payment.amount}
                                                                    onChange={(e) => handlePaymentChange(payment.id, 'amount', e.target.value)}
                                                                    className="w-full p-2 pl-6 bg-transparent border-transparent hover:border-gray-100 dark:hover:border-neutral-700 focus:border-black dark:focus:border-white border rounded-xl text-center font-black text-black dark:text-white outline-none transition-all"
                                                                />
                                                            </div>
                                                            <div className="col-span-1 flex justify-end">
                                                                <button
                                                                    onClick={() => handleRemovePayment(payment.id)}
                                                                    className="text-gray-300 hover:text-red-500 transition-all p-2"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {/* Draft Row */}
                                                    <div className="grid grid-cols-12 gap-2 items-center py-3 px-4 text-sm bg-gray-50/50 dark:bg-neutral-800/30">
                                                        <div className="col-span-6">
                                                            <DatePicker
                                                                value={draftPayment.due_date ? parseISO(draftPayment.due_date) : undefined}
                                                                onChange={(date) => setDraftPayment({ ...draftPayment, due_date: date ? format(date, 'yyyy-MM-dd') : '' })}
                                                                placeholder={t('date')}
                                                                className="w-full"
                                                            />
                                                        </div>
                                                        <div className="col-span-5 relative">
                                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-[10px] font-bold">₪</span>
                                                            <input
                                                                type="number"
                                                                value={draftPayment.amount}
                                                                onChange={(e) => setDraftPayment({ ...draftPayment, amount: e.target.value })}
                                                                placeholder="0"
                                                                className="w-full p-2 pl-5 bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 rounded-xl text-center font-bold text-black dark:text-white outline-none"
                                                            />
                                                        </div>
                                                        <div className="col-span-1 flex justify-end">
                                                            <button
                                                                onClick={handleAddPayment}
                                                                disabled={!draftPayment.due_date || !draftPayment.amount}
                                                                className="text-black dark:text-white hover:opacity-70 disabled:opacity-20 transition-all p-2"
                                                                title="Add"
                                                            >
                                                                <Plus className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-neutral-800 p-4 border-t border-gray-100 dark:border-neutral-800 flex justify-end items-center">
                                                <div className="text-xs font-black uppercase tracking-widest text-black dark:text-white">
                                                    {t('totalActual')}: <span className="text-lg ml-2">₪{paymentHistory.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Configuration */}
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block ml-1">{t('linkageType')}</label>
                                        <select
                                            value={recLinkageType}
                                            onChange={(e) => setRecLinkageType(e.target.value as any)}
                                            className="w-full p-4 bg-gray-50 dark:bg-neutral-800 border-transparent focus:bg-white dark:focus:bg-neutral-700 border focus:border-black dark:focus:border-white rounded-2xl font-bold text-black dark:text-white transition-all outline-none appearance-none"
                                        >
                                            <option value="cpi">{t('cpi')}</option>
                                            <option value="housing">{t('housingServices')}</option>
                                            <option value="construction">{t('constructionInputs')}</option>
                                            <option value="usd">{t('usdRate')}</option>
                                            <option value="eur">{t('eurRate')}</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t('baseIndexDate')}</label>
                                        <DatePicker
                                            value={contractStartDate ? parseISO(contractStartDate) : undefined}
                                            onChange={(date) => setContractStartDate(date ? format(date, 'yyyy-MM-dd') : '')}
                                            placeholder={t('baseIndexDate')}
                                            className="w-full"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t('periodStart')}</label>
                                        <DatePicker
                                            value={periodStart ? parseISO(periodStart) : undefined}
                                            onChange={(date) => setPeriodStart(date ? format(date, 'yyyy-MM-dd') : '')}
                                            placeholder={t('periodStart')}
                                            className="w-full"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t('periodEnd')}</label>
                                        <DatePicker
                                            value={periodEnd ? parseISO(periodEnd) : undefined}
                                            onChange={(date) => setPeriodEnd(date ? format(date, 'yyyy-MM-dd') : '')}
                                            placeholder={t('periodEnd')}
                                            className="w-full"
                                        />
                                    </div>

                                    {/* Link to advanced options toggle or similar */}
                                    <button
                                        onClick={() => setShowRecAdvanced(!showRecAdvanced)}
                                        className="flex items-center gap-2 text-sm text-primary hover:underline pt-4"
                                    >
                                        {showRecAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        {t('advancedReconciliationOptions')}
                                    </button>

                                    {showRecAdvanced && (
                                        <div className="space-y-4 pt-4 border-t border-border mt-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">{t('linkageCalculationMethod')}</label>
                                                <div className="flex gap-4">
                                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="linkageSubType"
                                                            value="known"
                                                            checked={recLinkageSubType === 'known'}
                                                            onChange={() => setRecLinkageSubType('known')}
                                                            className="w-4 h-4 text-primary"
                                                        />
                                                        {t('knownIndex')}
                                                    </label>
                                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="linkageSubType"
                                                            value="respect_of"
                                                            checked={recLinkageSubType === 'respect_of'}
                                                            onChange={() => setRecLinkageSubType('respect_of')}
                                                            className="w-4 h-4 text-primary"
                                                        />
                                                        {t('inRespectOf')}
                                                    </label>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {t('knownIndexHelp')}
                                                </p>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">{t('updateFrequency')}</label>
                                                <select
                                                    value={recUpdateFrequency}
                                                    onChange={(e) => setRecUpdateFrequency(e.target.value as any)}
                                                    className="w-full p-3 bg-background border border-border rounded-xl"
                                                >
                                                    <option value="monthly">{t('everyMonth')}</option>
                                                    <option value="quarterly">{t('quarterly')}</option>
                                                    <option value="semiannually">{t('semiannually')}</option>
                                                    <option value="annually">{t('annually')}</option>
                                                </select>
                                                <p className="text-xs text-muted-foreground">
                                                    {t('updateFrequencyHelp')}
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">{t('linkageFloor')}</label>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <input
                                                            type="checkbox"
                                                            id="baseFloor"
                                                            checked={recIndexBaseMinimum}
                                                            onChange={(e) => setRecIndexBaseMinimum(e.target.checked)}
                                                            className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                                                        />
                                                        <label htmlFor="baseFloor" className="text-sm cursor-pointer select-none">
                                                            {t('indexBaseMin')}
                                                        </label>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {t('indexBaseMinHelp')}
                                                    </p>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">{t('maxIncrease')}</label>
                                                    <input
                                                        type="number"
                                                        value={recMaxIncrease}
                                                        onChange={(e) => setRecMaxIncrease(e.target.value)}
                                                        className="w-full p-3 bg-background border border-border rounded-xl"
                                                        placeholder="5"
                                                    />
                                                    <p className="text-xs text-muted-foreground">{t('capCeiling')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Advanced Reconciliation Options */}
                            <button
                                onClick={() => setShowRecAdvanced(!showRecAdvanced)}
                                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {showRecAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                {t('advancedLinkageOptions')}
                            </button>

                            {showRecAdvanced && (
                                <div className="space-y-4 pt-4 border-t border-border bg-secondary/10 p-4 rounded-xl">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t('indexSubType')}</label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="linkageSubType"
                                                    value="known"
                                                    checked={recLinkageSubType === 'known'}
                                                    onChange={() => setRecLinkageSubType('known')}
                                                    className="w-4 h-4 text-primary"
                                                />
                                                {t('knownIndex')}
                                            </label>
                                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="linkageSubType"
                                                    value="respect_of"
                                                    checked={recLinkageSubType === 'respect_of'}
                                                    onChange={() => setRecLinkageSubType('respect_of')}
                                                    className="w-4 h-4 text-primary"
                                                />
                                                {t('inRespectOf')}
                                            </label>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {t('knownIndexHelp')}
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t('updateFrequency')}</label>
                                        <select
                                            value={recUpdateFrequency}
                                            onChange={(e) => setRecUpdateFrequency(e.target.value as any)}
                                            className="w-full p-3 bg-background border border-border rounded-xl"
                                        >
                                            <option value="monthly">{t('everyMonth')}</option>
                                            <option value="quarterly">{t('quarterly')}</option>
                                            <option value="semiannually">{t('semiannually')}</option>
                                            <option value="annually">{t('annually')}</option>
                                        </select>
                                        <p className="text-xs text-muted-foreground">
                                            {t('updateFrequencyHelp')}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">{t('linkageFloor')}</label>
                                            <div className="flex items-center gap-2 mt-2">
                                                <input
                                                    type="checkbox"
                                                    id="baseFloor"
                                                    checked={recIndexBaseMinimum}
                                                    onChange={(e) => setRecIndexBaseMinimum(e.target.checked)}
                                                    className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                                                />
                                                <label htmlFor="baseFloor" className="text-sm cursor-pointer select-none">
                                                    {t('indexBaseMin')}
                                                </label>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {t('indexBaseMinHelp')}
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">{t('maxIncrease')}</label>
                                            <input
                                                type="number"
                                                value={recMaxIncrease}
                                                onChange={(e) => setRecMaxIncrease(e.target.value)}
                                                className="w-full p-3 bg-background border border-border rounded-xl"
                                                placeholder="5"
                                            />
                                            <p className="text-xs text-muted-foreground">{t('capCeiling')}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleReconciliationCalculate}
                                disabled={loading || !recBaseRent || !contractStartDate || !periodStart || !periodEnd}
                                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? t('calculating') : t('calculateBackPay')}
                            </button>
                        </div>

                        {/* Reconciliation Results */}
                        {reconciliationResult && (
                            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                                <h3 className="font-bold text-lg">{t('paymentReconciliationResults')}</h3>
                                <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 p-6 rounded-xl border border-red-200 dark:border-red-800">
                                    <span className="text-xs text-muted-foreground block mb-1">{t('totalBackPayOwed')}</span>
                                    <span className="text-3xl font-bold text-red-600 dark:text-red-400">₪{reconciliationResult.totalBackPayOwed.toLocaleString()}</span>
                                    <p className="text-sm text-muted-foreground mt-2">{t('periodEnd')} {reconciliationResult.totalMonths} {t('month')}</p>
                                </div>

                                <button
                                    onClick={() => setShowBreakdown(!showBreakdown)}
                                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                                >
                                    {showBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    {t('monthlyBreakdown')}
                                </button>

                                {showBreakdown && (
                                    <div className="border border-border rounded-xl overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-secondary/50">
                                                <tr>
                                                    <th className="p-3 text-left">{t('month')}</th>
                                                    <th className="p-3 text-right">{t('shouldPay')}</th>
                                                    <th className="p-3 text-right">{t('paid')}</th>
                                                    <th className="p-3 text-right">{t('runningBalance')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reconciliationResult.monthlyBreakdown.map((month) => (
                                                    <tr key={month.month} className="border-t border-border">
                                                        <td className="p-3">
                                                            {/* month.month is YYYY-MM. Convert to mm/yyyy or use manual formatting for "all dates" request */}
                                                            {month.month.split('-').reverse().join('/')}
                                                        </td>
                                                        <td className="p-3 text-right">₪{month.shouldHavePaid.toLocaleString()}</td>
                                                        <td className="p-3 text-right">₪{month.actuallyPaid.toLocaleString()}</td>
                                                        <td className={cn("p-3 text-right font-medium", month.difference > 0 ? "text-red-600" : "text-green-600")}>
                                                            ₪{month.difference.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}


                                <button
                                    onClick={() => setIsGeneratorOpen(true)}
                                    className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold transition-all hover:opacity-90 flex items-center justify-center gap-2 mt-4 shadow-lg"
                                >
                                    <Share2 className="w-5 h-5" />
                                    {t('shareResult')}
                                </button>
                            </div>
                        )}
                    </div>
                )
            }

            <MessageGeneratorModal
                isOpen={isGeneratorOpen}
                onClose={() => setIsGeneratorOpen(false)}
                calculationData={{
                    input: activeTab === 'standard' ? {
                        type: 'standard',
                        baseRent,
                        linkageType,
                        baseDate,
                        targetDate
                    } : {
                        type: 'reconciliation',
                        baseRent: expectedHistory[0]?.amount || '', // Use first month as base or just the list
                        linkageType,
                        periodStart,
                        periodEnd,
                        expectedHistory,
                        actualPayments: paymentHistory
                    },
                    result: activeTab === 'standard' ? standardResult : reconciliationResult
                }}
            />
        </div >
    );
}
