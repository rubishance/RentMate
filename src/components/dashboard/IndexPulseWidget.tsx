import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import { getLatestIndex, getIndexValue } from '../../services/index-data.service';
import { format, subMonths } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Activity, TrendingUp, TrendingDown, Minus, Clock, ArrowRight, Settings2, Check, X, Plus, Trash2, ChevronDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { DatePicker } from '../ui/DatePicker';
import { SegmentedControl } from '../ui/SegmentedControl';

export interface TrackedIndex {
    id: string;
    type: 'cpi' | 'housing';
    method: 'known' | 'base';
    date: string;
}

interface IndexPulse {
    id: string;
    trackedId: string;
    type: 'cpi' | 'housing';
    value: number;
    baseValue: number;
    date: string;
    change: number;
    configDate: string;
    method: 'known' | 'base';
}

export interface IndexPulseSettings {
    trackedIndices?: TrackedIndex[];
}

interface IndexPulseWidgetProps {
    settings?: IndexPulseSettings;
    onUpdateSettings?: (settings: IndexPulseSettings) => void;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
}

const ALL_TYPES = ['cpi', 'housing'] as const;

export function IndexPulseWidget({ settings, onUpdateSettings, isExpanded: externalIsExpanded, onToggleExpand }: IndexPulseWidgetProps) {
    const { t, lang } = useTranslation();
    const navigate = useNavigate();
    const [pulses, setPulses] = useState<IndexPulse[]>([]);
    const [baseIndexes, setBaseIndexes] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [localIsExpanded, setLocalIsExpanded] = useState(true);
    const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : localIsExpanded;
    
    const toggleExpand = () => {
        if (onToggleExpand) {
            onToggleExpand();
        } else {
            setLocalIsExpanded(!localIsExpanded);
        }
    };

    const defaultDate = useMemo(() => format(subMonths(new Date(), 1), 'yyyy-MM-dd'), []);

    // Local state for settings
    const [localIndices, setLocalIndices] = useState<TrackedIndex[]>(() => {
        if (settings?.trackedIndices && settings.trackedIndices.length > 0) {
            return settings.trackedIndices;
        }

        // Migrate old settings
        // This part assumes `settings` might still contain legacy fields if not fully migrated
        // If `settings` is strictly `IndexPulseSettings`, this block might need adjustment
        if ((settings as any)?.displayedIndices) {
            return (settings as any).displayedIndices.map((type: string) => ({
                id: crypto.randomUUID(),
                type: type as 'cpi' | 'housing',
                method: 'base' as const,
                date: (settings as any).baseDates?.[type] ? format(new Date((settings as any).baseDates[type]), 'yyyy-MM-dd') : defaultDate
            }));
        }

        // Default
        return [
            { id: crypto.randomUUID(), type: 'cpi', method: 'known', date: defaultDate },
            { id: crypto.randomUUID(), type: 'housing', method: 'known', date: defaultDate }
        ];
    });

    // Reset local state when settings change from outside (optional, but good practice)
    useEffect(() => {
        if (settings?.trackedIndices) {
            setLocalIndices(settings.trackedIndices);
        }
    }, [settings?.trackedIndices]);

    useEffect(() => {
        let mounted = true;

        async function loadData() {
            try {
                const activeIndices = settings?.trackedIndices || localIndices;
                if (!activeIndices || activeIndices.length === 0) {
                    if (mounted) {
                        setPulses([]);
                        setIsLoading(false);
                    }
                    return;
                }

                const results = await Promise.all(
                    activeIndices.map(async (tracked) => {
                        const latest = await getLatestIndex(tracked.type);
                        if (!latest) return null;

                        let effectiveBaseDate = tracked.date.slice(0, 7);
                        if (tracked.method === 'known') {
                            const d = new Date(tracked.date);
                            // Always shift back 1 month because the index published this month belongs to the previous month
                            d.setMonth(d.getMonth() - 1);
                            
                            // If today is the 15th or earlier, the index for the previous month hasn't been published yet
                            if (d.getDate() <= 15) {
                                d.setMonth(d.getMonth() - 1);
                            }
                            effectiveBaseDate = format(d, 'yyyy-MM');
                        }

                        const baseVal = await getIndexValue(tracked.type, effectiveBaseDate);

                        let change = 0;
                        if (baseVal) {
                            change = ((latest.value - baseVal) / baseVal) * 100;
                        }

                        return {
                            id: `pulse-${tracked.id}`,
                            trackedId: tracked.id,
                            type: tracked.type,
                            value: latest.value,
                            baseValue: baseVal || 0,
                            date: latest.date,
                            change: change,
                            configDate: tracked.date,
                            method: tracked.method
                        } as IndexPulse;
                    })
                );

                if (mounted) {
                    setPulses(results.filter(Boolean) as IndexPulse[]);
                    setIsLoading(false);
                }
            } catch (error) {
                console.error('[IndexPulseWidget] Load failed', error);
                if (mounted) setIsLoading(false);
            }
        }

        loadData();
        return () => { mounted = false; };
    }, [settings?.trackedIndices, localIndices]);

    const addIndex = () => {
        setLocalIndices(prev => [
            ...prev,
            { id: crypto.randomUUID(), type: 'cpi', method: 'known', date: defaultDate }
        ]);
    };

    const updateIndex = (id: string, updates: Partial<TrackedIndex>) => {
        setLocalIndices(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    };

    const removeIndex = (id: string) => {
        setLocalIndices(prev => prev.filter(i => i.id !== id));
    };

    const groupedPulses = useMemo(() => {
        const groups: Record<string, { type: string, latestValue: number, latestDate: string, trackers: IndexPulse[] }> = {};
        pulses.forEach(pulse => {
            if (!groups[pulse.type]) {
                groups[pulse.type] = {
                    type: pulse.type,
                    latestValue: pulse.value,
                    latestDate: pulse.date,
                    trackers: []
                };
            }
            groups[pulse.type].trackers.push(pulse);
        });
        return Object.values(groups);
    }, [pulses]);

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

    return (
        <Card hoverEffect glass className={cn("flex flex-col h-full group/widget relative overflow-hidden transition-all duration-300", isExpanded && !isSettingsOpen ? "min-h-[300px]" : "")}>
            <AnimatePresence mode="wait">
                {!isSettingsOpen ? (
                    <motion.div
                        key="main"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.02 }}
                        className="flex flex-col h-full"
                    >
                        <div 
                            className="cursor-pointer select-none group/header relative z-20"
                            onClick={toggleExpand}
                        >
                            <CardHeader className="flex flex-row items-center justify-between p-4 md:p-6 pb-2 space-y-0">
                                <div className="flex items-center gap-2 sm:gap-4">
                                    <div className="p-2 bg-slate-100 dark:bg-neutral-800 rounded-xl shrink-0">
                                        <Activity className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <CardTitle className="text-xl font-black font-heading text-primary">
                                        {lang === 'he' ? 'מעקב מדדים' : 'Market Intelligence'}
                                    </CardTitle>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div
                                        onPointerDown={(e) => { e.stopPropagation(); setIsSettingsOpen(true); }}
                                        onClick={(e) => { e.stopPropagation(); setIsSettingsOpen(true); }}
                                        className="h-8 w-8 p-0 flex items-center justify-center rounded-lg cursor-pointer group-hover/header:text-foreground text-muted-foreground/50 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors z-[100] relative pointer-events-auto"
                                    >
                                        <Settings2 className="w-4 h-4 text-muted-foreground pointer-events-none" />
                                    </div>
                                    <div className="text-muted-foreground/50 group-hover/header:text-foreground transition-colors p-1">
                                        <ChevronDown className={cn("w-5 h-5 transition-transform duration-300", isExpanded && "rotate-180")} />
                                    </div>
                                </div>
                            </CardHeader>
                        </div>

                        <AnimatePresence>
                            {isExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <CardContent className="space-y-4 flex-1 pt-4 pb-6">
                            {pulses.map((pulse) => (
                                <motion.div
                                    key={pulse.id}
                                    layoutId={`pulse-${pulse.id}`}
                                    className="bg-background dark:bg-neutral-900/50 p-4 md:p-4 sm:p-6 rounded-xl border border-slate-100 dark:border-white/5 hover:border-indigo-500/20 transition-all flex flex-col gap-2 sm:gap-4 relative overflow-hidden group/item"
                                >
                                    {/* 1. Title: Index type in full string */}
                                    <div className="flex items-center border-b border-slate-100 dark:border-white/5 pb-2">
                                        <span className="text-lg font-bold text-foreground">
                                            {t(pulse.type as any) || pulse.type.toUpperCase()},{' '}
                                            <span className="text-muted-foreground font-medium">
                                                {pulse.method === 'known' ? t('knownIndex') : t('determiningIndex')}
                                            </span>
                                        </span>
                                    </div>

                                    <div className="flex flex-row justify-between items-start px-2 py-2 gap-4">
                                         {/* Base Index Column */}
                                         <div className="flex flex-col flex-1 items-start">
                                            <span className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">{lang === 'he' ? 'מדד בסיס' : 'Base Index'}</span>
                                            <span className="text-xl font-bold text-foreground opacity-90 mt-1">
                                                {pulse.baseValue > 0 ? pulse.baseValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '---'}
                                            </span>
                                            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 font-mono mt-1">
                                                <Clock className="w-3 h-3 opacity-70" />
                                                {format(new Date(pulse.configDate), 'dd/MM/yyyy')}
                                            </span>
                                         </div>

                                         {/* Divider */}
                                         <div className="w-px h-12 bg-slate-200 dark:bg-white/10 self-center" />

                                         {/* Current Index Column */}
                                         <div className="flex flex-col flex-1 items-end text-right">
                                            <span className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">{lang === 'he' ? 'מדד נוכחי' : 'Current Index'}</span>
                                            <span className="text-xl font-black text-foreground mt-1">
                                                {pulse.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                            </span>
                                            <span className="text-xs font-medium text-muted-foreground flex items-center justify-end gap-1 font-mono mt-1 w-full flex-row-reverse">
                                                {pulse.date}
                                                <Clock className="w-3 h-3 opacity-70" />
                                            </span>
                                         </div>
                                    </div>

                                    {/* 3. Percentage Change Block */}
                                    <div className="pt-3 mt-1 border-t border-slate-100 dark:border-white/5">
                                        <div className={cn(
                                            "flex items-center justify-center gap-2 text-base font-black px-4 py-3 rounded-lg w-full",
                                            pulse.change > 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : 
                                            pulse.change < 0 ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : 
                                            "bg-slate-100 dark:bg-neutral-800 text-muted-foreground"
                                        )}>
                                            <div className={cn(lang === 'he' && "-scale-x-100", "flex items-center justify-center")}>
                                                {pulse.change > 0 ? <TrendingUp className="w-5 h-5" /> : pulse.change < 0 ? <TrendingDown className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                                            </div>
                                            <span dir="ltr" className="text-lg">{pulse.change > 0 ? '+' : ''}{pulse.change.toFixed(2)}%</span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </CardContent>
                                </motion.div>
                            )}
                        </AnimatePresence>
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
                            {/* Per-Index Configuration */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                                        {t('trackedIndices') || 'TRACKED INDICES'}
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <AnimatePresence>
                                        {localIndices.map((tracked) => (
                                            <motion.div
                                                key={tracked.id}
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="bg-background dark:bg-white/5 p-4 rounded-xl border border-slate-100 dark:border-white/10 space-y-4 relative"
                                            >
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute top-2 right-2 h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                                    onClick={() => removeIndex(tracked.id)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>

                                                <div className="pr-8 space-y-4">
                                                    {/* Type Select */}
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">{t('indexType') || 'INDEX TYPE'}</label>
                                                        <select
                                                            value={tracked.type}
                                                            onChange={(e) => updateIndex(tracked.id, { type: e.target.value as any })}
                                                            className="w-full bg-white dark:bg-neutral-900 border border-slate-200 dark:border-white/10 rounded-xl px-2 sm:px-4 py-2 text-xs font-bold outline-none"
                                                        >
                                                            {ALL_TYPES.map(tOption => (
                                                                <option key={tOption} value={tOption}>{t(tOption) || tOption.toUpperCase()}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* Method Control */}
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">{t('linkageCalculationMethod') || 'CALCULATION METHOD'}</label>
                                                        <SegmentedControl
                                                            options={[
                                                                { label: t('knownIndex') || 'Known Index', value: 'known' },
                                                                { label: t('determiningIndex') || 'Base Index', value: 'base' }
                                                            ]}
                                                            value={tracked.method}
                                                            onChange={(val) => updateIndex(tracked.id, { method: val as any })}
                                                        />
                                                    </div>

                                                    {/* Date Picker */}
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">{t('baseDate') || 'BASE DATE'}</label>
                                                        <DatePicker
                                                            value={tracked.date ? new Date(tracked.date) : new Date(defaultDate)}
                                                            onChange={(date) => updateIndex(tracked.id, { date: date ? format(date, 'yyyy-MM-dd') : defaultDate })}
                                                            className="w-full"
                                                            variant="default"
                                                        />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={addIndex}
                                        className="w-full border-dashed gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        {t('addTrackedIndex') || 'Add Tracked Index'}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>

                        <CardFooter className="pt-2">
                            <Button
                                onClick={() => {
                                    onUpdateSettings?.({
                                        ...settings,
                                        trackedIndices: localIndices
                                    });
                                    setIsSettingsOpen(false);
                                }}
                                className="w-full"
                                noEffects
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
