import { useMemo } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { SparklesIcon as Sparkles, ArrowRightIcon as ArrowRight, PaymentsIcon as Wallet, WrenchIcon as Hammer, ContractsIcon as FileText, CalendarIcon as CheckCircle2 } from '../icons/NavIcons';
import { useNavigate } from 'react-router-dom';

interface SmartAction {
    id: string;
    type: 'payment' | 'maintenance' | 'upload' | 'contract';
    title: string;
    description: string;
    actionLabel: string;
    onAction: () => void;
    priority: 'high' | 'medium' | 'low';
}

interface SmartActionsWidgetProps {
    stats: {
        pendingMoney: number;
        openMaintenance: number;
    };
    loading?: boolean;
}

export function SmartActionsWidget({ stats, loading }: SmartActionsWidgetProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const actions: SmartAction[] = useMemo(() => {
        const list: SmartAction[] = [];

        // 1. Pending Payments Logic
        if (stats.pendingMoney > 0) {
            list.push({
                id: 'collect_rent',
                type: 'payment',
                title: t('paymentPendingTitle'),
                description: t('paymentPendingDesc', { amount: (stats.pendingMoney || 0).toLocaleString() }),
                actionLabel: t('sendReminder'),
                priority: 'high',
                onAction: () => navigate('/payments?filter=pending')
            });
        }

        // 2. Open Maintenance
        if (stats.openMaintenance > 0) {
            list.push({
                id: 'fix_maintenance',
                type: 'maintenance',
                title: t('activeMaintenanceTitle'),
                description: t('activeMaintenanceDesc', { count: stats.openMaintenance }),
                actionLabel: t('viewRequests'),
                priority: 'medium',
                onAction: () => navigate('/properties?tab=maintenance')
            });
        }

        // 3. Document Upload Nudge (Generic "Good Practice" if quiet)
        if (list.length === 0) {
            list.push({
                id: 'upload_bills',
                type: 'upload',
                title: t('organizeDocsTitle'),
                description: t('organizeDocsDesc'),
                actionLabel: t('uploadNow'),
                priority: 'low',
                onAction: () => navigate('/properties')
            });
        }

        return list;
    }, [stats, t, navigate]);

    if (loading) {
        return (
            <div className="bg-black dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-[2.5rem] p-8 shadow-lg text-white h-full flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-3 w-full">
                    <div className="h-6 w-1/2 bg-white/10 rounded"></div>
                    <div className="h-4 w-3/4 bg-white/5 rounded"></div>
                </div>
            </div>
        );
    }

    if (actions.length === 0) return null;

    // Show top action only for "Hero" simplicity
    const topAction = actions[0];

    return (
        <div className="bg-black dark:bg-neutral-900 rounded-[2.5rem] p-8 shadow-2xl text-white relative overflow-hidden group border border-gray-100 dark:border-neutral-800 h-full flex flex-col justify-between">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Sparkles className="w-48 h-48 transform rotate-12" />
            </div>

            <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-2 bg-white/10 w-fit px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10">
                    <Sparkles className="w-3 h-3 text-white" />
                    {t('smartRecommendation')}
                </div>

                <div className="space-y-2">
                    <h3 className="text-2xl font-black tracking-tight">{topAction.title}</h3>
                    <p className="text-gray-400 text-sm max-w-[90%] leading-relaxed font-medium">
                        {topAction.description}
                    </p>
                </div>
            </div>

            <div className="relative z-10 mt-8">
                <button
                    onClick={topAction.onAction}
                    className="w-full bg-white text-black px-6 py-4 rounded-2xl font-black text-sm hover:bg-gray-100 transition-all active:scale-95 shadow-xl flex items-center justify-center gap-2 group/btn"
                    aria-label={topAction.actionLabel}
                >
                    {topAction.actionLabel}
                    <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                </button>
            </div>
        </div>
    );
}
