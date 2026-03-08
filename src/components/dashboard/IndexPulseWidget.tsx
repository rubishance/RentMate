import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import { getLatestIndex, getIndexValue } from '../../services/index-data.service';
import { format, subMonths } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Activity, TrendingUp, TrendingDown, Minus, Clock, ArrowRight, Settings2, Check, X, Plus, Trash2 } from 'lucide-react';
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

interface IndexPulseWidgetProps {
    settings?: {
        trackedIndices?: TrackedIndex[];
        displayedIndices?: string[]; // Legacy Support
        baseDates?: Record<string, string>; // Legacy Support
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

    const defaultDate = useMemo(() => format(subMonths(new Date(), 1), 'yyyy-MM-dd'), []);

    // Local state for settings
    const [localIndices, setLocalIndices] = useState<TrackedIndex[]>(() => {
        if (settings?.trackedIndices && settings.trackedIndices.length > 0) {
            return settings.trackedIndices;
        }

        // Migrate old settings
        if (settings?.displayedIndices) {
            return settings.displayedIndices.map(type => ({
                id: crypto.randomUUID(),
                type: type as 'cpi' | 'housing',
                method: 'base' as const,
                date: settings.baseDates?.[type] ? format(new Date(settings.baseDates[type]), 'yyyy-MM-dd') : defaultDate
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
    }, [settings?.trackedIndices]);

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
                                <CardTitle className="text-base uppercase tracking-widest text-muted-foreground">{t('indexWatcherTitle')}</CardTitle>
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
                            {groupedPulses.map((group) => (
                                <motion.div
                                    key={group.type}
                                    layoutId={`group-${group.type}`}
                                    className="bg-background dark:bg-neutral-900/50 p-4 rounded-xl border border-slate-100 dark:border-white/5 hover:border-indigo-500/20 transition-all group/item"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-lg font-bold text-foreground">{t(group.type as any) || group.type.toUpperCase()}</span>
                                            <span className="text-base text-muted-foreground flex items-center gap-1.5 font-mono">
                                                <Clock className="w-3.5 h-3.5" />
                                                {group.latestDate}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-3xl font-black text-foreground leading-none">
                                                {group.latestValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-3 mt-4 pt-4 border-t border-slate-200 dark:border-white/5 opacity-95 transition-opacity">
                                        {group.trackers.map(tracker => (
                                            <div key={tracker.id} className="flex items-center justify-between bg-white dark:bg-neutral-800/50 p-3 rounded-lg border border-slate-100 dark:border-white/5">
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                                                        <span className="text-foreground font-bold">
                                                            {format(new Date(tracker.configDate), 'dd/MM/yyyy')}
                                                        </span>
                                                        <span className="text-foreground font-normal text-xs opacity-80">({tracker.method === 'known' ? t('knownIndex') : t('determiningIndex')})</span>
                                                    </div>
                                                    {tracker.baseValue > 0 && (
                                                        <span className="font-mono text-sm text-muted-foreground">
                                                            {t('baseIndex')}: {tracker.baseValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className={cn(
                                                    "flex items-center justify-end gap-1.5 text-base font-black px-2 py-1 rounded-md min-w-[80px]",
                                                    tracker.change > 0 ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : tracker.change < 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-slate-100 dark:bg-neutral-800 text-muted-foreground"
                                                )}>
                                                    {tracker.change > 0 ? <TrendingUp className="w-4 h-4" /> : tracker.change < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                                                    {Math.abs(tracker.change).toFixed(2)}%
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            ))}
                        </CardContent>
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
                                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('indexType') || 'INDEX TYPE'}</label>
                                                        <select
                                                            value={tracked.type}
                                                            onChange={(e) => updateIndex(tracked.id, { type: e.target.value as any })}
                                                            className="w-full bg-white dark:bg-neutral-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs font-bold outline-none"
                                                        >
                                                            {ALL_TYPES.map(tOption => (
                                                                <option key={tOption} value={tOption}>{t(tOption) || tOption.toUpperCase()}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* Method Control */}
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('linkageCalculationMethod') || 'CALCULATION METHOD'}</label>
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
                                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('baseDate') || 'BASE DATE'}</label>
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
                                    onUpdateSettings({
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
