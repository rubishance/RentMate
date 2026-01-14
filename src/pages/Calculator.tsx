import { Calculator as CalcIcon, TrendingUp, ChevronDown, ChevronUp, Share2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { calculateStandard, calculateReconciliation } from '../services/calculator.service';
import { format, parseISO } from 'date-fns';
import { DatePicker } from '../components/ui/DatePicker';
import type { StandardCalculationResult, ReconciliationResult } from '../types/database';
import { MessageGeneratorModal } from '../components/modals/MessageGeneratorModal';
import logoFinalCleanV2 from '../assets/logo-final-clean-v2.png';

type TabType = 'standard' | 'reconciliation';

export function Calculator({ embedMode = false }: { embedMode?: boolean }) {
    const location = useLocation();
    const { lang, t } = useTranslation();
    const [activeTab, setActiveTab] = useState<TabType>('standard');
    const [loading, setLoading] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);

    // Standard Mode State
    const [baseRent, setBaseRent] = useState('5000');
    const [linkageType, setLinkageType] = useState<'cpi' | 'housing' | 'construction' | 'usd' | 'eur'>('cpi');
    const [baseDate, setBaseDate] = useState('');
    const [targetDate, setTargetDate] = useState('');
    const [partialLinkage, setPartialLinkage] = useState('100');
    const [standardResult, setStandardResult] = useState<StandardCalculationResult | null>(null);

    // Reconciliation Mode State
    const [recBaseRent, setRecBaseRent] = useState('5000');
    const [recLinkageType, setRecLinkageType] = useState<'cpi' | 'housing' | 'construction' | 'usd' | 'eur'>('cpi');
    const [contractStartDate, setContractStartDate] = useState('');
    const [periodStart, setPeriodStart] = useState('');
    const [periodEnd, setPeriodEnd] = useState('');
    const [actualPaid, setActualPaid] = useState('5000');
    const [recPartialLinkage] = useState('100');
    const [reconciliationResult, setReconciliationResult] = useState<ReconciliationResult | null>(null);

    const [showBreakdown, setShowBreakdown] = useState(false);
    const [isSharedCalculation, setIsSharedCalculation] = useState(false);

    // Decode shared calculation from URL
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const shareParam = params.get('share');

        if (shareParam) {
            try {
                // Decode base64 and parse JSON
                const json = decodeURIComponent(atob(shareParam));
                const data = JSON.parse(json);

                if (data.input && data.result) {
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
                        if (data.input.partialLinkage) setPartialLinkage(data.input.partialLinkage.toString());

                        // Set the result
                        setStandardResult(data.result);
                    } else if (calcType === 'reconciliation') {
                        // Pre-fill reconciliation calculation
                        if (data.input.baseRent) setRecBaseRent(data.input.baseRent.toString());
                        if (data.input.linkageType) setRecLinkageType(data.input.linkageType);
                        if (data.input.contractStartDate) setContractStartDate(data.input.contractStartDate);
                        if (data.input.periodStart) setPeriodStart(data.input.periodStart);
                        if (data.input.periodEnd) setPeriodEnd(data.input.periodEnd);
                        if (data.input.actualPaid) setActualPaid(data.input.actualPaid.toString());

                        // Set the result
                        setReconciliationResult(data.result);
                        setShowBreakdown(true);
                    }
                }
            } catch (error) {
                console.error('Error decoding shared calculation:', error);
                // Invalid share link - just ignore it
            }
        }
    }, [location.search]);

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
        const newPayment = {
            id: `manual-${Date.now()}`,
            due_date: periodStart || new Date().toISOString().split('T')[0],
            amount: 0,
            status: 'manual'
        };
        const updatedHistory = [...paymentHistory, newPayment];
        setPaymentHistory(updatedHistory);
        updateMonthlyActuals(updatedHistory);
    };

    const handleRemovePayment = (id: string) => {
        if (!confirm('Are you sure you want to delete this payment?')) return;
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
                partialLinkage: parseFloat(partialLinkage)
            });
            setStandardResult(result);
        } catch (error) {
            console.error('Calculation error:', error);
            alert('Calculation failed. Please check your inputs.');
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
        const newPayment = {
            id: `manual-exp-${Date.now()}`,
            due_date: periodStart || new Date().toISOString().split('T')[0],
            amount: parseFloat(recBaseRent) || 0
        };
        setExpectedHistory(prev => [...prev, newPayment]);
    };

    const handleRemoveExpected = (id: string) => {
        if (!confirm('Are you sure you want to delete this expected item?')) return;
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
            alert(error instanceof Error ? error.message : 'Calculation failed. Please check your inputs.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`max-w-3xl mx-auto space-y-6 ${embedMode ? '' : 'pb-20'}`}>
            {/* Shared Calculation Banner */}
            {isSharedCalculation && (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center gap-3">
                    <Share2 className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
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
                <div className="flex flex-col items-center space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                        <img src={logoFinalCleanV2} alt="RentMate" className="h-20 w-auto object-contain" />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center justify-center gap-2">
                        <CalcIcon className="w-5 h-5 text-primary" />
                        {lang === 'he' ? 'מחשבון הצמדה' : 'Index Calculator'}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {lang === 'he' ? 'חישוב הפרשי הצמדה למדד' : 'Calculate rent adjustments and payment reconciliation'}
                    </p>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 bg-secondary/30 p-1 rounded-xl">
                <button
                    onClick={() => setActiveTab('standard')}
                    className={cn(
                        "flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all",
                        activeTab === 'standard'
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    {t('standardCalculation')}
                </button>
                <button
                    onClick={() => setActiveTab('reconciliation')}
                    className={cn(
                        "flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all",
                        activeTab === 'reconciliation'
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    {t('paymentReconciliation')}
                </button>
            </div>

            {/* Contract Selection (Global for Reco) */}
            {activeTab === 'reconciliation' && (
                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50">
                    <label className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2 block">
                        {t('loadFromContract')}
                    </label>
                    <select
                        className="w-full p-2.5 bg-white dark:bg-black/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm"
                        onChange={async (e) => {
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
            )}

            {/* Helper to update derived monthly actuals */}
            {/* We'll define the function outside but since we are in render body we can just use a const function */}
            {/* Actually better to define it inside the component body, let's just insert it before the return */}


            {/* Standard Calculation Tab */}
            {activeTab === 'standard' && (
                <div className="space-y-6">
                    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('baseRent')}</label>
                                <input
                                    type="number"
                                    value={baseRent}
                                    onChange={(e) => setBaseRent(e.target.value)}
                                    className="w-full p-3 bg-background border border-border rounded-xl"
                                    placeholder="5000"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('linkageType')}</label>
                                <select
                                    value={linkageType}
                                    onChange={(e) => setLinkageType(e.target.value as any)}
                                    className="w-full p-3 bg-background border border-border rounded-xl"
                                >
                                    <option value="cpi">{t('cpi')}</option>
                                    <option value="housing">{t('housingServices')}</option>
                                    <option value="construction">{t('constructionInputs')}</option>
                                    <option value="usd">{t('usdRate')}</option>
                                    <option value="eur">{t('eurRate')}</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('baseDate')}</label>
                                <DatePicker
                                    value={baseDate ? parseISO(baseDate) : undefined}
                                    onChange={(date) => setBaseDate(date ? format(date, 'yyyy-MM-dd') : '')}
                                    placeholder={t('selectBaseDate')}
                                    className="w-full"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('targetDate')}</label>
                                <DatePicker
                                    value={targetDate ? parseISO(targetDate) : undefined}
                                    onChange={(date) => setTargetDate(date ? format(date, 'yyyy-MM-dd') : '')}
                                    placeholder={t('selectTargetDate')}
                                    minDate={baseDate ? parseISO(baseDate) : undefined}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        {/* Advanced Options */}
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            {t('advancedOptions')}
                        </button>

                        {showAdvanced && (
                            <div className="space-y-2 pt-2 border-t border-border">
                                <label className="text-sm font-medium">{t('partialLinkage')}</label>
                                <input
                                    type="number"
                                    value={partialLinkage}
                                    onChange={(e) => setPartialLinkage(e.target.value)}
                                    className="w-full p-3 bg-background border border-border rounded-xl"
                                    placeholder="100"
                                    min="0"
                                    max="100"
                                />
                                <p className="text-xs text-muted-foreground">{t('partialLinkageHelp')}</p>
                            </div>
                        )}

                        <button
                            onClick={handleStandardCalculate}
                            disabled={loading || !baseRent || !baseDate || !targetDate}
                            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? t('calculating') : t('calculate')}
                            <TrendingUp className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Standard Results */}
                    {standardResult && (
                        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                            <h3 className="font-bold text-lg">{t('results')}</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-secondary/30 p-4 rounded-xl">
                                    <span className="text-xs text-muted-foreground block mb-1">{t('newRent')}</span>
                                    <span className="text-2xl font-bold text-primary">₪{standardResult.newRent.toLocaleString()}</span>
                                </div>
                                <div className="bg-secondary/30 p-4 rounded-xl">
                                    <span className="text-xs text-muted-foreground block mb-1">{t('linkageCoefficient')}</span>
                                    <span className="text-2xl font-bold">{standardResult.linkageCoefficient.toFixed(2)}%</span>
                                </div>
                                <div className="bg-secondary/30 p-4 rounded-xl">
                                    <span className="text-xs text-muted-foreground block mb-1">{t('change')}</span>
                                    <span className="text-xl font-bold">₪{Math.round(standardResult.absoluteChange).toLocaleString()}</span>
                                </div>
                                <div className="bg-secondary/30 p-4 rounded-xl">
                                    <span className="text-xs text-muted-foreground block mb-1">{t('percentage')}</span>
                                    <span className="text-xl font-bold">{standardResult.percentageChange.toFixed(2)}%</span>
                                </div>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl text-sm">
                                <p className="font-medium mb-1">{t('formula')}</p>
                                <p className="text-muted-foreground">{standardResult.formula}</p>
                            </div>

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
                    input: {
                        baseRent,
                        linkageType,
                        baseDate,
                        targetDate,
                        partialLinkage
                    },
                    result: standardResult
                }}
            />

            {/* Payment Reconciliation Tab */}
            {
                activeTab === 'reconciliation' && (
                    <div className="space-y-6">
                        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-medium">Expected Base Rent</label>
                                        <button
                                            onClick={() => {
                                                if (expectedHistory.length === 0 && periodStart && periodEnd) {
                                                    // Generate 
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
                                    {expectedHistory.length > 0 ? (
                                        <div className="border border-border rounded-xl overflow-hidden bg-background">
                                            <div className="bg-secondary/30 p-2 text-xs font-medium text-muted-foreground flex justify-between px-4 sticky top-0 z-10">
                                                <span>Date & Base Amount</span>
                                                <span>Actions</span>
                                            </div>
                                            <div className="max-h-60 overflow-y-auto">
                                                <div className="divide-y divide-border">
                                                    {expectedHistory.map((payment) => (
                                                        <div key={payment.id} className="flex justify-between items-center p-2 text-sm hover:bg-secondary/10 transition-colors group">
                                                            <div className="flex gap-2 items-center flex-1">
                                                                <div className="w-32">
                                                                    <DatePicker
                                                                        value={payment.due_date ? parseISO(payment.due_date) : undefined}
                                                                        onChange={(date) => handleExpectedChange(payment.id, 'due_date', date ? format(date, 'yyyy-MM-dd') : '')}
                                                                        placeholder={t('date')}
                                                                        className="w-full"
                                                                    />
                                                                </div>
                                                                <div className="relative">
                                                                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₪</span>
                                                                    <input
                                                                        type="number"
                                                                        value={payment.amount}
                                                                        onChange={(e) => handleExpectedChange(payment.id, 'amount', e.target.value)}
                                                                        className="w-20 p-1 pl-4 bg-transparent border border-transparent hover:border-border focus:border-primary rounded text-right font-medium outline-none transition-colors"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => handleRemoveExpected(payment.id)}
                                                                className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                                                title="Remove"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="bg-secondary/30 p-2 border-t border-border flex justify-between items-center">
                                                <button
                                                    onClick={handleAddExpected}
                                                    className="text-xs font-medium text-primary hover:underline flex items-center gap-1 px-2"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                                                    {t('addItem')}
                                                </button>
                                                <div className="text-xs font-bold px-4">
                                                    {t('totalBase')}: ₪{expectedHistory.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            <input
                                                type="number"
                                                value={recBaseRent}
                                                onChange={(e) => setRecBaseRent(e.target.value)}
                                                className="w-full p-3 bg-background border border-border rounded-xl"
                                                placeholder="5000"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                {t('globalBaseRentHelp')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t('linkageType')}</label>
                                    <select
                                        value={recLinkageType}
                                        onChange={(e) => setRecLinkageType(e.target.value as any)}
                                        className="w-full p-3 bg-background border border-border rounded-xl"
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
                                    <label className="text-sm font-medium">{t('actualPayments')}</label>
                                    {monthlyActuals ? (
                                        <div className="border border-border rounded-xl overflow-hidden bg-background">
                                            <div className="bg-secondary/30 p-2 text-xs font-medium text-muted-foreground flex justify-between px-4 sticky top-0 z-10">
                                                <span>{t('dateAndBaseAmount')}</span>
                                                <span>{t('actions')}</span>
                                            </div>
                                            <div className="max-h-60 overflow-y-auto">
                                                {paymentHistory.length === 0 ? (
                                                    <div className="p-8 text-center space-y-2">
                                                        <p className="text-sm text-muted-foreground">{t('noPaymentsListed')}</p>
                                                        <button
                                                            onClick={handleAddPayment}
                                                            className="text-primary text-sm hover:underline"
                                                        >
                                                            {t('addFirstPayment')}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="divide-y divide-border">
                                                        {paymentHistory.map((payment) => (
                                                            <div key={payment.id} className="flex justify-between items-center p-2 text-sm hover:bg-secondary/10 transition-colors group">
                                                                <div className="flex gap-2 items-center flex-1">
                                                                    <div className="w-32">
                                                                        <DatePicker
                                                                            value={payment.due_date ? parseISO(payment.due_date) : undefined}
                                                                            onChange={(date) => handlePaymentChange(payment.id, 'due_date', date ? format(date, 'yyyy-MM-dd') : '')}
                                                                            placeholder={t('date')}
                                                                            className="w-full"
                                                                        />
                                                                    </div>
                                                                    <div className="relative">
                                                                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₪</span>
                                                                        <input
                                                                            type="number"
                                                                            value={payment.amount}
                                                                            onChange={(e) => handlePaymentChange(payment.id, 'amount', e.target.value)}
                                                                            className="w-20 p-1 pl-4 bg-transparent border border-transparent hover:border-border focus:border-primary rounded text-right font-medium outline-none transition-colors"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleRemovePayment(payment.id)}
                                                                    className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                                                    title="Remove from calculation"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="bg-secondary/30 p-2 border-t border-border flex justify-between items-center">
                                                <button
                                                    onClick={handleAddPayment}
                                                    className="text-xs font-medium text-primary hover:underline flex items-center gap-1 px-2"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                                                    {t('addPayment')}
                                                </button>
                                                <div className="text-xs font-bold px-4">
                                                    {t('totalActual')}: ₪{paymentHistory.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            <input
                                                type="number"
                                                value={actualPaid}
                                                onChange={(e) => setActualPaid(e.target.value)}
                                                className="w-full p-3 bg-background border border-border rounded-xl"
                                                placeholder="5000"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                {t('manualPaymentHelp')}
                                            </p>
                                        </div>
                                    )}
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

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-secondary/30 p-4 rounded-xl">
                                        <span className="text-xs text-muted-foreground block mb-1">{t('avgUnderpayment')}</span>
                                        <span className="text-xl font-bold">₪{reconciliationResult.averageUnderpayment.toLocaleString()}/{t('month')}</span>
                                    </div>
                                    <div className="bg-secondary/30 p-4 rounded-xl">
                                        <span className="text-xs text-muted-foreground block mb-1">{t('percentageOwed')}</span>
                                        <span className="text-xl font-bold">{reconciliationResult.percentageOwed.toFixed(2)}%</span>
                                    </div>
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
                                                    <th className="p-3 text-right">{t('diff')}</th>
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
                        targetDate,
                        partialLinkage
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
