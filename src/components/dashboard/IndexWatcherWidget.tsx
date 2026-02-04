import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { TrendingUpIcon as TrendingUp, ActivityIcon as Activity, ArrowRightIcon as ArrowRight, ClockIcon as Clock, SettingsIcon as Settings } from '../icons/NavIcons';
import { RotateCcw, Check, ChevronRight, TrendingUp as TrendingUpLucide } from 'lucide-react';
import { getLatestIndex, getIndexValue } from '../../services/index-data.service';
import { calculateStandard } from '../../services/calculator.service';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

interface TrackedIndexConfig {
    type: 'cpi' | 'housing' | 'construction' | 'usd' | 'eur';
    baseDate?: string;
}

interface IndexWatcherWidgetProps {
    contracts: any[];
    settings?: {
        trackedIndices?: TrackedIndexConfig[];
        autoFetchContracts?: boolean;
    };
    onUpdateSettings?: (newSettings: any) => void;
}

export function IndexWatcherWidget({ contracts, settings, onUpdateSettings }: IndexWatcherWidgetProps) {
    const { t, lang } = useTranslation();
    const navigate = useNavigate();
    const [projections, setProjections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFlipped, setIsFlipped] = useState(false);

    // Initial settings fallback
    const trackedIndices = settings?.trackedIndices || [];
    const autoFetchContracts = settings?.autoFetchContracts ?? true;

    const linkedContracts = useMemo(() => {
        return contracts.filter(c => c.linkage_type && c.linkage_type !== 'none' && c.status === 'active');
    }, [contracts]);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const results: any[] = [];
                const today = new Date();
                const latestMonthStr = today.toISOString().slice(0, 7);

                // 1. Manual/Configured Indices
                if (trackedIndices.length > 0) {
                    const manualResults = await Promise.all(trackedIndices.map(async (cfg) => {
                        const latest = await getLatestIndex(cfg.type);
                        if (!latest) return null;

                        let change = 0;
                        let oldValue = null;

                        if (cfg.baseDate) {
                            oldValue = await getIndexValue(cfg.type, cfg.baseDate);
                            if (oldValue !== null && latest.value !== null) {
                                change = ((latest.value - oldValue) / oldValue) * 100;
                            }
                        }

                        return {
                            id: `manual-${cfg.type}-${cfg.baseDate || 'latest'}`,
                            title: t(cfg.type) || cfg.type.toUpperCase(),
                            oldValue,
                            newValue: latest.value,
                            change,
                            indexType: cfg.type,
                            indexDate: latest.date,
                            baseDate: cfg.baseDate,
                            isManual: true
                        };
                    }));
                    results.push(...manualResults.filter(Boolean));
                }

                // 2. Auto-Contract Projections (if enabled)
                if (autoFetchContracts && linkedContracts.length > 0) {
                    const contractResults = await Promise.all(linkedContracts.map(async contract => {
                        if (!contract.base_index_date) return null;

                        const subType = contract.linkage_sub_type || 'known';
                        let targetDateStr = latestMonthStr;

                        if (subType === 'known') {
                            const d = new Date(today);
                            d.setMonth(d.getMonth() - 1);
                            if (today.getDate() <= 15) d.setMonth(d.getMonth() - 1);
                            targetDateStr = d.toISOString().slice(0, 7);
                        }

                        const res = await calculateStandard({
                            baseRent: contract.base_rent,
                            linkageType: contract.linkage_type,
                            baseDate: contract.base_index_date.slice(0, 7),
                            targetDate: targetDateStr,
                            linkageCeiling: contract.linkage_ceiling,
                            isIndexBaseMinimum: contract.linkage_floor !== null,
                        });

                        if (!res) return null;

                        const property = Array.isArray(contract.properties) ? contract.properties[0] : contract.properties;
                        const address = property ? `${property.address}, ${property.city}` : t('unknownProperty');

                        return {
                            id: `contract-${contract.id}`,
                            title: address,
                            oldRent: contract.base_rent,
                            newRent: res.newRent,
                            change: res.percentageChange,
                            indexType: contract.linkage_type,
                            indexDate: targetDateStr,
                            isProjected: true
                        };
                    }));
                    results.push(...contractResults.filter(Boolean));
                }

                setProjections(results);
            } catch (err) {
                console.error("Error in IndexWatcherWidget:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [linkedContracts, trackedIndices, autoFetchContracts, t]);

    const handleToggleFlip = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsFlipped(!isFlipped);
    };

    const handleSaveSettings = (newTracked: TrackedIndexConfig[], auto: boolean) => {
        if (onUpdateSettings) {
            onUpdateSettings({ trackedIndices: newTracked, autoFetchContracts: auto });
        }
        setIsFlipped(false);
    };

    return (
        <div className="relative w-full h-full perspective-1000">
            <motion.div
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
                className="w-full h-full preserve-3d"
            >
                {/* Front Side */}
                <div className={cn(
                    "absolute inset-0 backface-hidden",
                    isFlipped && "pointer-events-none"
                )}>
                    <IndexFrontView
                        loading={loading}
                        projections={projections}
                        onToggleSettings={handleToggleFlip}
                        t={t}
                        navigate={navigate}
                    />
                </div>

                {/* Back Side (Settings) */}
                <div className={cn(
                    "absolute inset-0 backface-hidden rotate-y-180",
                    !isFlipped && "pointer-events-none"
                )}>
                    <IndexSettingsView
                        currentSettings={{ trackedIndices, autoFetchContracts }}
                        onSave={handleSaveSettings}
                        onCancel={() => setIsFlipped(false)}
                        t={t}
                        lang={lang}
                    />
                </div>
            </motion.div>
        </div>
    );
}

function IndexFrontView({ loading, projections, onToggleSettings, t, navigate }: any) {
    if (loading) {
        return (
            <div className="glass-premium rounded-[2.5rem] p-8 shadow-minimal border-white/10 h-full flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-3 w-full text-center">
                    <Activity className="w-8 h-8 text-indigo-500/20 animate-spin" />
                    <div className="h-4 w-1/3 bg-white/10 rounded"></div>
                </div>
            </div>
        );
    }

    const hasData = projections.length > 0;

    return (
        <div className="glass-premium rounded-[2.5rem] p-8 shadow-minimal hover:shadow-jewel transition-all duration-500 border-white/10 h-full flex flex-col group/widget">
            <div className="flex items-center justify-between mb-8">
                <h3 className="font-black text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    {t('indexWatcherTitle')}
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onToggleSettings}
                        className="p-2.5 bg-white/5 hover:bg-white/10 dark:bg-neutral-800/30 dark:hover:bg-neutral-800/50 rounded-xl transition-all text-muted-foreground hover:text-foreground border border-white/5"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                        {t('liveUpdate')}
                    </div>
                </div>
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto pr-1">
                {!hasData ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-10 opacity-60">
                        <div className="w-12 h-12 bg-gray-50 dark:bg-neutral-800 rounded-2xl flex items-center justify-center text-gray-400">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <p className="text-xs text-gray-500 font-medium">{t('noLinkedContracts')}</p>
                    </div>
                ) : (
                    projections.slice(0, 4).map((item: any) => (
                        <div key={item.id} className="group cursor-pointer" onClick={() => navigate('/calculator')}>
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm text-black dark:text-white truncate pr-2">{item.title}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-neutral-800 px-1.5 rounded">
                                            {t(item.indexType) || item.indexType.toUpperCase()}
                                        </span>
                                        <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {item.indexDate}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-1 justify-end">
                                        <TrendingUp className={`w-3 h-3 ${item.change > 0 ? 'text-red-500' : item.change < 0 ? 'text-emerald-500' : 'text-gray-400'}`} />
                                        <span className={`text-xs font-black ${item.change > 0 ? 'text-red-500' : item.change < 0 ? 'text-emerald-500' : 'text-gray-500 dark:text-gray-400'}`}>
                                            {item.change > 0 ? '+' : ''}{item.change.toFixed(2)}%
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 bg-white/5 dark:bg-neutral-800/30 p-4 rounded-[1.8rem] border border-white/5 group-hover:border-indigo-500/20 group-hover:bg-indigo-500/5 transition-all duration-500">
                                {item.isManual ? (
                                    <>
                                        <div className="flex-1">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-0.5">{item.baseDate ? t('baseRate') : t('rate')}</p>
                                            <p className="text-sm font-bold text-black dark:text-gray-300">
                                                {item.oldValue ? item.oldValue.toFixed(4) : item.newValue.toFixed(4)}
                                            </p>
                                        </div>
                                        {item.baseDate && (
                                            <>
                                                <div className="w-px h-8 bg-gray-200 dark:bg-neutral-700"></div>
                                                <div className="flex-1 pl-2">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 dark:text-emerald-400 mb-0.5">{t('currentRate')}</p>
                                                    <p className="text-sm font-black text-black dark:text-white">{item.newValue.toFixed(4)}</p>
                                                </div>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className="flex-1">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-0.5">{t('currentRent')}</p>
                                            <p className="text-sm font-bold text-black dark:text-gray-300">₪{(item.oldRent || 0).toLocaleString()}</p>
                                        </div>
                                        <div className="w-px h-8 bg-gray-200 dark:bg-neutral-700"></div>
                                        <div className="flex-1 pl-2">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 dark:text-emerald-400 mb-0.5">{t('projectedRent')}</p>
                                            <p className="text-sm font-black text-black dark:text-white">₪{(item.newRent || 0).toLocaleString()}</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <button
                onClick={() => navigate('/calculator')}
                className="mt-6 w-full py-4 flex items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-all border-t border-white/5 group-hover/widget:border-indigo-500/20"
            >
                {t('calculateLinkageAndMore')} <ArrowRight className="w-3 h-3 mx-2 group-hover/widget:translate-x-1 transition-transform" />
            </button>
        </div>
    );
}

function IndexSettingsView({ currentSettings, onSave, onCancel, t, lang }: any) {
    const [tracked, setTracked] = useState<TrackedIndexConfig[]>(currentSettings.trackedIndices || []);
    const [auto, setAuto] = useState(currentSettings.autoFetchContracts);

    const availableIndices = ['cpi', 'housing', 'construction', 'usd', 'eur'] as const;

    const toggleIndex = (type: any) => {
        if (tracked.some(t => t.type === type)) {
            setTracked(tracked.filter(t => t.type !== type));
        } else {
            setTracked([...tracked, { type }]);
        }
    };

    const updateBaseDate = (type: string, date: string) => {
        setTracked(tracked.map(t => t.type === type ? { ...t, baseDate: date } : t));
    };

    return (
        <div className="glass-premium rounded-[2.5rem] p-8 shadow-jewel border-indigo-500/30 flex flex-col h-full overflow-hidden relative">
            {/* Settings Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full" />

            <div className="flex items-center justify-between mb-6 relative z-10">
                <h3 className="font-black text-[10px] uppercase tracking-widest text-white/40 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    {t('widgetSettings')}
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                {/* Auto Contracts Toggle */}
                <div className="flex items-center justify-between p-4 bg-white/5 dark:bg-black/20 rounded-2xl border border-white/5">
                    <div>
                        <p className="text-xs font-bold text-white mb-0.5">{t('autoDetectContracts')}</p>
                        <p className="text-[10px] text-white/40">{t('autoDetectContractsDesc')}</p>
                    </div>
                    <button
                        onClick={() => setAuto(!auto)}
                        className={cn(
                            "w-10 h-6 rounded-full relative transition-colors",
                            auto ? "button-jewel" : "bg-neutral-700/50"
                        )}
                    >
                        <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                            auto ? (lang === 'he' ? "right-5" : "left-5") : (lang === 'he' ? "right-1" : "left-1")
                        )} />
                    </button>
                </div>

                {/* Manual Indices */}
                <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 px-1">{t('marketIndicesToTrack')}</p>
                    <div className="grid grid-cols-1 gap-3">
                        {availableIndices.map(type => {
                            const isTracked = tracked.find(t => t.type === type);
                            return (
                                <div key={type} className={cn(
                                    "p-4 rounded-2xl border transition-all duration-500",
                                    isTracked ? "bg-indigo-500/10 border-indigo-500/30" : "bg-white/5 border-transparent hover:border-white/10"
                                )}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                                isTracked ? "bg-emerald-500 text-white" : "bg-neutral-800 text-neutral-500"
                                            )}>
                                                {isTracked ? <Check className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                                            </div>
                                            <span className="text-sm font-bold">{t(type) || type.toUpperCase()}</span>
                                        </div>
                                        <button
                                            onClick={() => toggleIndex(type)}
                                            className={cn(
                                                "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all",
                                                isTracked ? "bg-red-500/20 text-red-500" : "bg-white/10 text-white hover:bg-white/20"
                                            )}
                                        >
                                            {isTracked ? t('remove') : t('track')}
                                        </button>
                                    </div>

                                    {isTracked && (
                                        <div className="space-y-2 pt-2 border-t border-white/5">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-white/40">{t('baseDateOptional')}</p>
                                            <input
                                                type="month"
                                                value={isTracked.baseDate || ''}
                                                onChange={(e) => updateBaseDate(type, e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs focus:border-emerald-500 outline-none transition-all"
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="flex gap-3 mt-8 pt-6 border-t border-white/10">
                <button
                    onClick={onCancel}
                    className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {t('cancel')}
                </button>
                <button
                    onClick={() => onSave(tracked, auto)}
                    className="flex-[2] py-4 button-jewel rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    <Check className="w-3.5 h-3.5" />
                    {t('saveSettings')}
                </button>
            </div>
        </div>
    );
}
