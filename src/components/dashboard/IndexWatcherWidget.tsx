import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { TrendingUpIcon as TrendingUp, ActivityIcon as Activity, ArrowRightIcon as ArrowRight, ClockIcon as Clock, AlertCircleIcon as Info } from '../icons/NavIcons';
import { getLatestIndex } from '../../services/index-data.service';
import { calculateStandard } from '../../services/calculator.service';
import { useNavigate } from 'react-router-dom';

interface IndexWatcherWidgetProps {
    contracts: any[];
}

export function IndexWatcherWidget({ contracts }: IndexWatcherWidgetProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [projections, setProjections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const linkedContracts = useMemo(() => {
        return contracts.filter(c => c.linkage_type && c.linkage_type !== 'none' && c.status === 'active');
    }, [contracts]);

    useEffect(() => {
        async function fetchProjections() {
            if (linkedContracts.length === 0) {
                setLoading(false);
                return;
            }

            try {
                // Fetch latest indices for relevant types
                const types = Array.from(new Set(linkedContracts.map(c => c.linkage_type))) as any[];
                const latestIndices: Record<string, any> = {};

                await Promise.all(types.map(async type => {
                    const latest = await getLatestIndex(type);
                    if (latest) latestIndices[type] = latest;
                }));

                const results = await Promise.all(linkedContracts.map(async contract => {
                    const latest = latestIndices[contract.linkage_type];
                    if (!latest) return null;

                    const res = await calculateStandard({
                        baseRent: contract.base_rent,
                        linkageType: contract.linkage_type,
                        baseDate: contract.base_index_date || contract.start_date.slice(0, 7),
                        targetDate: latest.date,
                        isIndexBaseMinimum: true, // Typical standard
                    });

                    if (!res) return null;

                    // Unpack property address safely
                    const property = Array.isArray(contract.properties) ? contract.properties[0] : contract.properties;
                    const address = property ? `${property.address}, ${property.city}` : t('unknownProperty');

                    return {
                        id: contract.id,
                        address,
                        oldRent: contract.base_rent,
                        newRent: res.newRent,
                        change: res.percentageChange,
                        indexType: contract.linkage_type,
                        indexDate: latest.date,
                    };
                }));

                setProjections(results.filter(r => r !== null));
            } catch (err) {
                console.error("Error in IndexWatcherWidget:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchProjections();
    }, [linkedContracts, t]);

    if (loading) {
        return (
            <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-neutral-800 h-full flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-3 w-full text-center">
                    <Activity className="w-8 h-8 text-gray-200 dark:text-neutral-800 animate-spin" />
                    <div className="h-4 w-1/3 bg-gray-100 dark:bg-neutral-800 rounded"></div>
                </div>
            </div>
        );
    }

    if (linkedContracts.length === 0) {
        return (
            <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-neutral-800 h-full flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 bg-gray-50 dark:bg-neutral-800 rounded-2xl flex items-center justify-center text-gray-400">
                    <TrendingUp className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-sm font-bold text-black dark:text-white uppercase tracking-tight">{t('indexWatcherTitle')}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('noLinkedContracts')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-neutral-800 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
                <h3 className="font-black text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    {t('indexWatcherTitle')}
                </h3>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-tighter animate-pulse">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    {t('liveUpdate')}
                </div>
            </div>

            <div className="space-y-6 flex-1">
                {projections.slice(0, 3).map((item) => (
                    <div key={item.id} className="group cursor-pointer" onClick={() => navigate('/calculator')}>
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="font-bold text-sm text-black dark:text-white">{item.address}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-neutral-800 px-1.5 rounded">
                                        {item.indexType}
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

                        <div className="flex items-center gap-2 bg-gray-50/50 dark:bg-neutral-800/50 p-3 rounded-2xl border border-transparent group-hover:border-gray-100 dark:group-hover:border-neutral-700 transition-all">
                            <div className="flex-1">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-0.5">{t('currentRent')}</p>
                                <p className="text-sm font-bold text-black dark:text-gray-300">₪{item.oldRent.toLocaleString()}</p>
                            </div>
                            <div className="w-px h-8 bg-gray-200 dark:bg-neutral-700"></div>
                            <div className="flex-1 pl-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 dark:text-emerald-400 mb-0.5">{t('projectedRent')}</p>
                                <p className="text-sm font-black text-black dark:text-white">₪{item.newRent.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={() => navigate('/calculator')}
                className="mt-8 w-full py-3 flex items-center justify-center text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-all border-t border-gray-50 dark:border-neutral-800"
            >
                {t('calculateLinkageAndMore')} <ArrowRight className="w-3 h-3 ml-1" />
            </button>
        </div>
    );
}
