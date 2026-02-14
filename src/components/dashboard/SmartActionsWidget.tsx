import { useMemo } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { SparklesIcon as Sparkles, ArrowRightIcon as ArrowRight } from '../icons/NavIcons';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';

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

        return list;
    }, [stats, t, navigate]);

    if (loading) {
        return (
            <Card className="h-full flex items-center justify-center">
                <CardContent className="w-full">
                    <div className="animate-pulse flex flex-col items-center gap-3 w-full">
                        <div className="h-5 md:h-6 w-1/2 bg-slate-100 dark:bg-slate-800 rounded"></div>
                        <div className="h-3 md:h-4 w-3/4 bg-slate-50 dark:bg-slate-900 rounded"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (actions.length === 0) return null;

    // Show top action only for "Hero" simplicity
    const topAction = actions[0];

    return (
        <Card className="h-full flex flex-col justify-between overflow-hidden relative group border-primary/20 bg-slate-900 text-white dark:bg-slate-950">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sparkles className="w-48 h-48 transform rotate-12" />
            </div>

            <CardHeader className="relative z-10 pb-0">
                <div className="flex items-center gap-2 bg-white/10 w-fit px-2.5 py-1 md:px-3 md:py-1.5 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-widest backdrop-blur-md border border-white/10 mb-4">
                    <Sparkles className="w-2.5 md:w-3 h-2.5 md:h-3 text-emerald-400" />
                    {t('smartRecommendation')}
                </div>
                <CardTitle className="text-xl md:text-2xl text-white">{topAction.title}</CardTitle>
                <CardDescription className="text-slate-300 font-medium">
                    {topAction.description}
                </CardDescription>
            </CardHeader>

            <CardContent className="relative z-10 pt-4 flex-1">
                {/* Spacer or content if needed */}
            </CardContent>

            <CardFooter className="relative z-10 pt-0">
                <Button
                    onClick={topAction.onAction}
                    className="w-full bg-white text-slate-900 hover:bg-slate-100 font-bold"
                    size="lg"
                >
                    {topAction.actionLabel}
                    <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
            </CardFooter>
        </Card>
    );
}
