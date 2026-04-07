import { useState, useMemo } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { SparklesIcon as Sparkles, ArrowRightIcon as ArrowRight } from '../icons/NavIcons';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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
    isExpanded?: boolean;
    onToggleExpand?: () => void;
}

export function SmartActionsWidget({ stats, loading, isExpanded: externalIsExpanded, onToggleExpand }: SmartActionsWidgetProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [localIsExpanded, setLocalIsExpanded] = useState(true);
    const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : localIsExpanded;

    const toggleExpand = () => {
        if (onToggleExpand) {
            onToggleExpand();
        } else {
            setLocalIsExpanded(!localIsExpanded);
        }
    };

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
                    <div className="animate-pulse flex flex-col items-center gap-2 sm:gap-4 w-full">
                        <div className="h-5 md:h-6 w-1/2 bg-muted rounded"></div>
                        <div className="h-3 md:h-4 w-3/4 bg-background rounded"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (actions.length === 0) return null;

    // Show top action only for "Hero" simplicity
    const topAction = actions[0];

    return (
        <Card className="h-full rounded-2xl flex flex-col justify-between overflow-hidden relative group border-primary/20 bg-slate-900 text-white dark:bg-slate-950">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity z-0 pointer-events-none">
                <Sparkles className="w-48 h-48 transform rotate-12" />
            </div>

            <CardHeader 
                className={cn(
                    "flex flex-row items-center justify-between space-y-0 pb-4 cursor-pointer select-none group/header relative z-10",
                    isExpanded ? "" : "pb-0"
                )}
                onClick={toggleExpand}
            >
                <div className="flex items-center gap-2 sm:gap-4">
                    <div className="p-2 bg-slate-100 dark:bg-neutral-800 rounded-xl shrink-0">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                    </div>
                    <CardTitle className="text-xl font-black font-heading text-primary">
                        {t('quickActions')}
                    </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-white/50 group-hover/header:text-white transition-colors p-1 bg-white/5 rounded-full backdrop-blur-sm">
                        <ChevronDown className={cn("w-5 h-5 transition-transform duration-300", isExpanded ? "rotate-180" : "rotate-0")} />
                    </div>
                </div>
            </CardHeader>

            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden relative z-10 flex-1 flex flex-col"
                    >
                        <CardHeader className="pt-2 pb-0 flex-none">
                            <CardTitle className="text-xl md:text-2xl text-white">{topAction.title}</CardTitle>
                            <CardDescription className="text-slate-300 font-medium">
                                {topAction.description}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="pt-4 flex-1">
                            {/* Spacer or content if needed */}
                        </CardContent>

                        <CardFooter className="pt-0 flex-none">
                            <Button
                                onClick={(e) => { e.stopPropagation(); topAction.onAction(); }}
                                className="w-full bg-white text-slate-900 hover:bg-muted/50 font-bold"
                                size="lg"
                            >
                                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                                {topAction.actionLabel}
                            </Button>
                        </CardFooter>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    );
}
