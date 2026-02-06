import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import { getLatestIndex, getIndexValue } from '../../services/index-data.service';
import { format, subMonths } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Activity, TrendingUp, TrendingDown, Minus, Clock, ArrowRight, Settings2, Check, X } from 'lucide-react';

interface IndexPulse {
    id: string;
    type: 'cpi' | 'housing' | 'construction' | 'usd' | 'eur';
    value: number;
    date: string;
    change: number;
}

interface IndexPulseWidgetProps {
    settings?: {
        displayedIndices?: string[]; // Array of types
        baseAmount?: number;
        baseDate?: string; // YYYY-MM
    };
    onUpdateSettings: (settings: any) => void;
}

const ALL_TYPES = ['cpi', 'housing', 'construction', 'usd', 'eur'] as const;

export function IndexPulseWidget({ settings, onUpdateSettings }: IndexPulseWidgetProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [pulses, setPulses] = useState<IndexPulse[]>([]);
    const [baseIndexes, setBaseIndexes] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Local state for settings to avoid immediate layout shifts during typing
    const [localBaseAmount, setLocalBaseAmount] = useState(settings?.baseAmount || 0);
    const [localBaseDate, setLocalBaseDate] = useState(settings?.baseDate || format(subMonths(new Date(), 1), 'yyyy-MM'));

    const displayedIndices = useMemo(() => {
        return settings?.displayedIndices || ['cpi', 'usd', 'eur'];
    }, [settings?.displayedIndices]);

    useEffect(() => {
        let mounted = true;

        async function loadData() {
            try {
                // 1. Load latest pulses
                const pulseResults = await Promise.all(
                    ALL_TYPES.map(async type => {
                        const latest = await getLatestIndex(type);
                        if (!latest) return null;
                        return {
                            id: `pulse-${type}`,
                            type,
                            value: latest.value,
                            date: latest.date,
                            change: 0 // Will calculate if base date is set
                        } as IndexPulse;
                    })
                );

                // 2. Load base indexes if base date is set
                const baseDate = settings?.baseDate || localBaseDate;
                const baseIndexResults: Record<string, number> = {};

                if (baseDate) {
                    await Promise.all(
                        ALL_TYPES.map(async type => {
                            const val = await getIndexValue(type, baseDate);
                            if (val) baseIndexResults[type] = val;
                        })
                    );
                }

                if (mounted) {
                    setBaseIndexes(baseIndexResults);

                    const processedPulses = (pulseResults.filter(Boolean) as IndexPulse[]).map(p => {
                        const baseVal = baseIndexResults[p.type];
                        if (baseVal) {
                            p.change = ((p.value - baseVal) / baseVal) * 100;
                        }
                        return p;
                    });

                    setPulses(processedPulses);
                    setIsLoading(false);
                }
            } catch (error) {
                console.error('[IndexPulseWidget] Load failed', error);
                if (mounted) setIsLoading(false);
            }
        }

        loadData();
        return () => { mounted = false; };
    }, [settings?.baseDate]); // Re-fetch base indexes when base date changes

    const toggleIndex = (type: string) => {
        const current = [...displayedIndices];
        const index = current.indexOf(type);
        if (index > -1) {
            if (current.length > 1) current.splice(index, 1);
        } else {
            current.push(type);
        }
        onUpdateSettings({ ...settings, displayedIndices: current });
    };

    if (isLoading) {
        return (
            <div className="glass-premium rounded-[2.5rem] p-8 min-h-[400px] flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center">
                    <Activity className="w-6 h-6 text-indigo-500 animate-pulse" />
                </div>
                <div className="h-4 w-24 bg-slate-200 dark:bg-neutral-800 animate-pulse rounded" />
            </div>
        );
    }

    const visiblePulses = pulses.filter(p => displayedIndices.includes(p.type));

    return (
        <div className="glass-premium rounded-[2.5rem] p-6 md:p-8 shadow-minimal hover:shadow-jewel transition-all duration-500 border-white/10 min-h-[300px] flex flex-col group/widget relative">

            <AnimatePresence mode="wait">
                {!isSettingsOpen ? (
                    <motion.div
                        key="main"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.02 }}
                        className="flex flex-col h-full"
                    >
                        <div className="flex items-center justify-between mb-6 md:mb-8">
                            <h3 className="font-black text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
                                <Activity className="w-3.5 md:w-4 h-3.5 md:h-4 text-emerald-500" />
                                {t('indexWatcherTitle')}
                            </h3>
                            <button
                                onClick={() => setIsSettingsOpen(true)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-400 transition-colors"
                            >
                                <Settings2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4 flex-1">
                            {visiblePulses.map((pulse) => (
                                <motion.div
                                    key={pulse.id}
                                    layoutId={pulse.id}
                                    className="bg-white/5 dark:bg-neutral-900/50 p-4 rounded-3xl border border-white/5 hover:border-indigo-500/20 transition-all group/item"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-neutral-800 flex items-center justify-center font-black text-[10px] text-slate-400">
                                                {pulse.type.substring(0, 3).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{t(pulse.type) || pulse.type.toUpperCase()}</span>
                                                <span className="text-[9px] text-slate-400 flex items-center gap-1 font-mono">
                                                    <Clock className="w-2.5 h-2.5" />
                                                    {pulse.date}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-slate-900 dark:text-white leading-none">
                                                {pulse.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                            </p>
                                            <div className={cn(
                                                "flex items-center justify-end gap-0.5 mt-1 text-[10px] font-black",
                                                pulse.change > 0 ? "text-rose-500" : pulse.change < 0 ? "text-emerald-500" : "text-slate-400"
                                            )}>
                                                {pulse.change > 0 ? <TrendingUp className="w-3 h-3" /> : pulse.change < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                                {Math.abs(pulse.change).toFixed(2)}%
                                            </div>
                                            {settings?.baseAmount && settings.baseAmount > 0 && (
                                                <p className="text-[10px] font-bold text-slate-500 mt-1">
                                                    {t('adjustedAmount')}: ₪{((pulse.value / (baseIndexes[pulse.type] || pulse.value)) * (settings.baseAmount || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <button
                            onClick={() => navigate('/calculator')}
                            className="mt-6 w-full py-4 flex items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-indigo-600 transition-all border-t border-white/5 group-hover/widget:border-indigo-500/20 gap-2"
                        >
                            {t('calculateLinkageAndMore')}
                            <ArrowRight className="w-3 h-3 transition-transform group-hover/widget:translate-x-1" />
                        </button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="settings"
                        initial={{ opacity: 0, scale: 1.02 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="flex flex-col"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="font-black text-[10px] uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                                <Settings2 className="w-4 h-4" />
                                {t('widgetSettings')}
                            </h3>
                            <button
                                onClick={() => setIsSettingsOpen(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-400 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 space-y-6 pb-8 overflow-y-auto max-h-[400px] scrollbar-none">
                            {/* Calculation Settings */}
                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {t('linkageCalculation')}
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">{t('baseAmount')}</label>
                                        <input
                                            type="number"
                                            value={localBaseAmount}
                                            onChange={(e) => setLocalBaseAmount(Number(e.target.value))}
                                            placeholder="5000"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold focus:border-indigo-500/50 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">{t('baseDate')}</label>
                                        <input
                                            type="month"
                                            value={localBaseDate}
                                            onChange={(e) => setLocalBaseDate(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold focus:border-indigo-500/50 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {t('selectDisplayedIndices')}
                                </p>
                                {ALL_TYPES.map(type => (
                                    <button
                                        key={type}
                                        onClick={() => toggleIndex(type)}
                                        className={cn(
                                            "w-full flex items-center justify-between p-4 rounded-3xl border transition-all duration-300",
                                            displayedIndices.includes(type)
                                                ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-premium"
                                                : "bg-white/5 border-white/5 text-slate-400 hover:border-white/10"
                                        )}
                                    >
                                        <span className="text-xs font-bold uppercase tracking-wider">{t(type) || type.toUpperCase()}</span>
                                        {displayedIndices.includes(type) && <Check className="w-4 h-4" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                onUpdateSettings({
                                    ...settings,
                                    displayedIndices,
                                    baseAmount: localBaseAmount,
                                    baseDate: localBaseDate
                                });
                                setIsSettingsOpen(false);
                            }}
                            className="mt-6 w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-premium hover:shadow-jewel transition-all"
                        >
                            {t('done')}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
