import { Calculator as CalcIcon, Share2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import { UrlCompression } from '../lib/url-compression';
import { StandardCalculator } from '../components/calculator/StandardCalculator';
import { ReconciliationCalculator } from '../components/calculator/ReconciliationCalculator';

type TabType = 'standard' | 'reconciliation';

export function Calculator({ embedMode = false }: { embedMode?: boolean }) {
    const location = useLocation();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<TabType>('standard');
    const [isSharedCalculation, setIsSharedCalculation] = useState(false);
    const [shouldAutoCalculate, setShouldAutoCalculate] = useState(false);

    // Initial Data State
    const [standardValues, setStandardValues] = useState<any>(undefined);
    const [recValues, setRecValues] = useState<any>(undefined);
    const [key, setKey] = useState(0); // Force re-render when data loads

    // 1. Handle Shared Link decoding
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const shareParam = params.get('share');

        if (shareParam) {
            const data = UrlCompression.decompress(shareParam);

            if (data) {
                setIsSharedCalculation(true);
                const calcType = data.input.type || 'standard';
                setActiveTab(calcType);

                if (calcType === 'standard') {
                    setStandardValues({ ...data.input });
                    if (!data.result) setShouldAutoCalculate(true);
                } else if (calcType === 'reconciliation') {
                    setRecValues({ ...data.input });
                    if (!data.result) setShouldAutoCalculate(true);
                }
                setKey(prev => prev + 1);
            }
        }
    }, [location.search]);

    // 2. Handle Navigation State (from Contract List etc.)
    useEffect(() => {
        if (location.state?.contractData) {
            const data = location.state.contractData;

            // Prepare Standard Data
            const sData: any = {};
            if (data.baseRent) sData.baseRent = data.baseRent.toString();
            if (data.linkageType) sData.linkageType = data.linkageType;
            if (data.baseIndexDate) sData.baseDate = data.baseIndexDate;

            // Prepare Rec Data
            const rData: any = {};
            if (data.baseRent) rData.baseRent = data.baseRent.toString();
            if (data.linkageType) rData.linkageType = data.linkageType;
            if (data.baseIndexDate) rData.contractStartDate = data.baseIndexDate;
            if (data.startDate) rData.periodStart = data.startDate;
            const now = new Date().toISOString().split('T')[0];
            rData.periodEnd = now;

            setStandardValues(sData);
            setRecValues(rData);
            setKey(prev => prev + 1);
        }
    }, [location.state]);

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Shared Calculation Banner */}
            {isSharedCalculation && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-primary/5 border border-primary/10 rounded-[1.5rem] p-6 flex items-center gap-4"
                >
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <Share2 className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs font-black uppercase tracking-widest text-primary">
                            {t('viewingSharedCalculation')}
                        </p>
                        <p className="text-sm font-medium text-muted-foreground mt-0.5">
                            {t('sharedCalculationDesc')}
                        </p>
                    </div>
                </motion.div>
            )}

            {/* Header - Only check if NOT in embed mode */}
            {!embedMode && (
                <div className="flex items-center justify-between mb-12">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black tracking-tighter uppercase">{t('calculator')}</h1>
                        <p className="text-sm font-bold text-muted-foreground tracking-tight">{t('calculateLinkageAndMore')}</p>
                    </div>
                    <div className="w-16 h-16 rounded-[2rem] bg-slate-50 dark:bg-neutral-800 flex items-center justify-center">
                        <CalcIcon className="w-8 h-8 text-slate-300" />
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 bg-slate-50 dark:bg-neutral-800/50 p-1.5 rounded-[1.5rem] border border-slate-100 dark:border-neutral-800">
                <button
                    onClick={() => setActiveTab('standard')}
                    className={cn(
                        "flex-1 py-4 px-6 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all",
                        activeTab === 'standard'
                            ? "bg-white dark:bg-neutral-900 text-foreground shadow-premium"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-neutral-800/50"
                    )}
                >
                    {t('standardCalculation')}
                </button>
                <button
                    onClick={() => setActiveTab('reconciliation')}
                    className={cn(
                        "flex-1 py-4 px-6 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all",
                        activeTab === 'reconciliation'
                            ? "bg-white dark:bg-neutral-900 text-foreground shadow-premium"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-neutral-800/50"
                    )}
                >
                    {t('paymentReconciliation')}
                </button>
            </div>

            <div key={key}>
                {activeTab === 'standard' ? (
                    <StandardCalculator
                        initialValues={standardValues}
                        shouldAutoCalculate={shouldAutoCalculate}
                    />
                ) : (
                    <ReconciliationCalculator
                        initialValues={recValues}
                        shouldAutoCalculate={shouldAutoCalculate}
                    />
                )}
            </div>
        </div>
    );
}
