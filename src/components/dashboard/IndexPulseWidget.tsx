import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import { getLatestIndex, getIndexValue } from '../../services/index-data.service';
import { format, subMonths } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Activity, TrendingUp, TrendingDown, Minus, Clock, ArrowRight, Settings2, Check, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';

interface IndexPulse {
    id: string;
    type: 'cpi' | 'housing';
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

const ALL_TYPES = ['cpi', 'housing'] as const;

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
        return settings?.displayedIndices || ['cpi', 'housing'];
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
            <Card className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center">
                    <Activity className="w-6 h-6 text-indigo-500 animate-pulse" />
                </div>
                <div className="h-4 w-24 bg-slate-200 dark:bg-neutral-800 animate-pulse rounded" />
            </Card>
        );
    }

    const visiblePulses = pulses.filter(p => displayedIndices.includes(p.type));

    return (
        <Card hoverEffect glass className="min-h-[300px] flex flex-col h-full group/widget relative overflow-hidden">
            <AnimatePresence mode="wait">
                {!isSettingsOpen ? (
                    <motion.div
                        key="main"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.02 }}
                        className="flex flex-col h-full"
                    >
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-emerald-500" />
                                <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">{t('indexWatcherTitle')}</CardTitle>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsSettingsOpen(true)}
                                className="h-8 w-8 p-0"
                            >
                                <Settings2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                        </CardHeader>

                        <CardContent className="space-y-4 flex-1 pt-4">
                            {visiblePulses.map((pulse) => (
                                <motion.div
                                    key={pulse.id}
                                    layoutId={pulse.id}
                                    className="bg-slate-50 dark:bg-neutral-900/50 p-4 rounded-xl border border-slate-100 dark:border-white/5 hover:border-indigo-500/20 transition-all group/item"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-neutral-800 flex items-center justify-center font-bold text-[10px] text-muted-foreground border border-slate-100 dark:border-neutral-700">
                                                {pulse.type.substring(0, 3).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-foreground">{t(pulse.type) || pulse.type.toUpperCase()}</span>
                                                <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                                                    <Clock className="w-2.5 h-2.5" />
                                                    {pulse.date}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-foreground leading-none">
                                                {pulse.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                            </p>
                                            <div className={cn(
                                                "flex items-center justify-end gap-0.5 mt-1 text-[10px] font-black",
                                                pulse.change > 0 ? "text-rose-500" : pulse.change < 0 ? "text-emerald-500" : "text-muted-foreground"
                                            )}>
                                                {pulse.change > 0 ? <TrendingUp className="w-3 h-3" /> : pulse.change < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                                {Math.abs(pulse.change).toFixed(2)}%
                                            </div>
                                            {settings?.baseAmount && settings.baseAmount > 0 && (
                                                <p className="text-[10px] font-bold text-muted-foreground mt-1">
                                                    {t('adjustedAmount')}: ₪{((pulse.value / (baseIndexes[pulse.type] || pulse.value)) * (settings.baseAmount || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </CardContent>

                        <CardFooter className="pt-2">
                            <Button
                                variant="ghost"
                                className="w-full justify-between text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-indigo-600"
                                onClick={() => navigate('/calculator')}
                            >
                                {t('calculateLinkageAndMore')}
                                <ArrowRight className="w-3 h-3 ml-2 transition-transform group-hover:translate-x-1" />
                            </Button>
                        </CardFooter>
                    </motion.div>
                ) : (
                    <motion.div
                        key="settings"
                        initial={{ opacity: 0, scale: 1.02 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="flex flex-col h-full"
                    >
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <div className="flex items-center gap-2">
                                <Settings2 className="w-4 h-4 text-indigo-500" />
                                <CardTitle className="text-sm uppercase tracking-widest text-indigo-600">{t('widgetSettings')}</CardTitle>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsSettingsOpen(false)}
                                className="h-8 w-8 p-0"
                            >
                                <X className="w-4 h-4 text-muted-foreground" />
                            </Button>
                        </CardHeader>

                        <CardContent className="flex-1 space-y-6 overflow-y-auto max-h-[400px] scrollbar-none pt-4">
                            {/* Calculation Settings */}
                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                    {t('linkageCalculation')}
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold text-muted-foreground uppercase">{t('baseAmount')}</label>
                                        <input
                                            type="number"
                                            value={localBaseAmount}
                                            onChange={(e) => setLocalBaseAmount(Number(e.target.value))}
                                            placeholder="5000"
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs font-bold focus:border-indigo-500/50 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold text-muted-foreground uppercase">{t('baseDate')}</label>
                                        <input
                                            type="month"
                                            value={localBaseDate}
                                            onChange={(e) => setLocalBaseDate(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs font-bold focus:border-indigo-500/50 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                    {t('selectDisplayedIndices')}
                                </p>
                                {ALL_TYPES.map(type => (
                                    <button
                                        key={type}
                                        onClick={() => toggleIndex(type)}
                                        className={cn(
                                            "w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-300",
                                            displayedIndices.includes(type)
                                                ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-400"
                                                : "bg-slate-50 border-slate-100 text-muted-foreground hover:border-slate-200 dark:bg-white/5 dark:border-white/5 dark:hover:border-white/10"
                                        )}
                                    >
                                        <span className="text-xs font-bold uppercase tracking-wider">{t(type) || type.toUpperCase()}</span>
                                        {displayedIndices.includes(type) && <Check className="w-4 h-4" />}
                                    </button>
                                ))}
                            </div>
                        </CardContent>

                        <CardFooter className="pt-2">
                            <Button
                                onClick={() => {
                                    onUpdateSettings({
                                        ...settings,
                                        displayedIndices,
                                        baseAmount: localBaseAmount,
                                        baseDate: localBaseDate
                                    });
                                    setIsSettingsOpen(false);
                                }}
                                className="w-full"
                            >
                                {t('done')}
                            </Button>
                        </CardFooter>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    );
}
