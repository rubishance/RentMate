import { useMemo } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { CalendarIcon as Calendar, ClockIcon as Clock, AlertCircleIcon as AlertTriangle, ArrowRightIcon as ArrowRight } from '../icons/NavIcons';
import { format, differenceInDays, addMonths, isAfter, isBefore } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface Contract {
    id: string;
    start_date: string;
    end_date: string;
    option_periods?: number;
    linkage_type: string;
    properties?: {
        address: string;
        city: string;
    } | { address: string; city: string; }[]; // Handle potential array from join
}

interface TimelineWidgetProps {
    contracts: Contract[];
    loading?: boolean;
}

export function TimelineWidget({ contracts, loading }: TimelineWidgetProps) {
    const { t, lang } = useTranslation();
    const navigate = useNavigate();
    const dateLocale = lang === 'he' ? he : enUS;

    const timelineItems = useMemo(() => {
        if (!contracts || contracts.length === 0) return [];

        return contracts.map(contract => {
            const startDate = new Date(contract.start_date);
            const endDate = new Date(contract.end_date);
            const today = new Date();

            const totalDays = differenceInDays(endDate, startDate);
            const daysPassed = differenceInDays(today, startDate);
            const progress = Math.min(100, Math.max(0, (daysPassed / totalDays) * 100));

            const daysLeft = differenceInDays(endDate, today);

            // Check for option deadline (typically 90 days before end)
            const optionDeadline = new Date(endDate);
            optionDeadline.setDate(optionDeadline.getDate() - 90);
            const isOptionApproaching = isAfter(today, addMonths(endDate, -4)) && isBefore(today, optionDeadline);

            // Unpack property address safely
            const property = Array.isArray(contract.properties) ? contract.properties[0] : contract.properties;
            const address = property ? `${property.address}, ${property.city}` : t('unknownProperty');

            return {
                ...contract,
                address,
                progress,
                daysLeft,
                isOptionApproaching,
                displayEndDate: format(endDate, 'dd/MM/yyyy'),
                displayOptionDeadline: format(optionDeadline, 'dd/MM/yyyy'),
                status: daysLeft < 30 ? 'critical' : daysLeft < 90 ? 'warning' : 'good'
            };
        }).sort((a, b) => a.daysLeft - b.daysLeft); // Sort by most urgent
    }, [contracts, lang, dateLocale, t]);

    if (loading) {
        return (
            <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-neutral-800 h-full flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-3 w-full">
                    <div className="h-4 w-1/3 bg-gray-100 dark:bg-neutral-800 rounded self-start"></div>
                    <div className="h-20 w-full bg-gray-50 dark:bg-neutral-800/50 rounded-[2rem]"></div>
                    <div className="h-20 w-full bg-gray-50 dark:bg-neutral-800/50 rounded-[2rem]"></div>
                </div>
            </div>
        );
    }

    if (timelineItems.length === 0) {
        return (
            <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-neutral-800 h-full flex flex-col items-center justify-center text-center min-h-[300px] space-y-6">
                <div className="w-16 h-16 bg-gray-50 dark:bg-neutral-800 rounded-2xl flex items-center justify-center">
                    <Calendar className="w-8 h-8 text-black dark:text-white" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-bold text-black dark:text-white">{t('noActiveContracts')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[200px]">{t('addContractDesc')}</p>
                </div>
                <button
                    onClick={() => navigate('/contracts/new')}
                    className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold transition-all active:scale-95 shadow-lg"
                >
                    {t('createContract')}
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-neutral-800">
            <div className="flex items-center justify-between mb-8">
                <h3 className="font-black text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {t('leaseTimeline')}
                </h3>
            </div>

            <div className="space-y-6">
                {timelineItems.slice(0, 3).map(item => (
                    <div key={item.id} className="relative group">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h4 className="font-bold text-black dark:text-white group-hover:underline cursor-pointer" onClick={() => navigate('/contracts')}>{item.address}</h4>
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mt-1">
                                    {item.daysLeft > 0
                                        ? t('daysLeft', { count: item.daysLeft })
                                        : t('contractEnded')}
                                </p>
                            </div>
                            <div className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5
                                ${item.status === 'critical' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-900/40' :
                                    item.status === 'warning' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 border border-orange-100 dark:border-orange-900/40' :
                                        'bg-gray-50 text-black dark:bg-neutral-800 dark:text-white border border-gray-100 dark:border-neutral-700'}`}
                            >
                                <Clock className="w-3 h-3" />
                                {item.displayEndDate}
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-1.5 w-full bg-gray-50 dark:bg-neutral-800 rounded-full overflow-hidden relative">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ease-out relative
                                    ${item.status === 'critical' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]' :
                                        item.status === 'warning' ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]' :
                                            'bg-black dark:bg-white'}`}
                                style={{ width: `${item.progress}%` }}
                            >
                                {/* Active Dot */}
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white dark:bg-neutral-900 border-2 border-inherit rounded-full shadow-lg z-10"></div>
                            </div>

                            {/* Option Marker */}
                            {item.daysLeft > 90 && (
                                <div className="absolute top-0 bottom-0 w-0.5 border-l border-dashed border-gray-300 dark:border-neutral-600 left-[75%]" title={t('optionDeadline')}></div>
                            )}
                        </div>

                        {item.isOptionApproaching && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-orange-600 bg-orange-50 dark:bg-orange-900/10 p-2 rounded-lg">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                <span>{t('optionDeadlineWarning', { date: item.displayOptionDeadline })}</span>
                                <button className="ml-auto underline font-medium hover:text-orange-700">
                                    {t('review')}
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {contracts.length > 3 && (
                <button
                    onClick={() => navigate('/contracts')}
                    className="w-full mt-4 text-xs text-muted-foreground hover:text-primary flex items-center justify-center gap-1 py-2"
                >
                    {t('viewAllContracts')} <ArrowRight className="w-3 h-3" />
                </button>
            )}
        </div>
    );
}
