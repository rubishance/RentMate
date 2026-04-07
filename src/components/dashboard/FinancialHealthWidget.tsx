import { useState, useMemo } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { cn } from '../../lib/utils';
import { TrendingUp, AlertTriangle, CheckCircle2, DollarSign, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mid-Century Traffic Light Colors
const STATUS_COLORS = {
    healthy: 'bg-emerald-500 shadow-emerald-500/20 text-emerald-50', // Olive/Green
    warning: 'bg-amber-500 shadow-amber-500/20 text-amber-50', // Harvest Gold
    critical: 'bg-rose-500 shadow-rose-500/20 text-rose-50', // Terracotta
};

interface FinancialHealthWidgetProps {
    stats: {
        monthlyIncome: number;
        collected: number;
        pending: number;
    };
    isExpanded?: boolean;
    onToggleExpand?: () => void;
}

export function FinancialHealthWidget({ stats, isExpanded: externalIsExpanded, onToggleExpand }: FinancialHealthWidgetProps) {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'he';
    const [localIsExpanded, setLocalIsExpanded] = useState(true);
    const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : localIsExpanded;

    const toggleExpand = () => {
        if (onToggleExpand) {
            onToggleExpand();
        } else {
            setLocalIsExpanded(!localIsExpanded);
        }
    };

    const healthStatus = useMemo(() => {
        if (stats.monthlyIncome === 0 && stats.pending === 0 && stats.collected === 0) return 'neutral';
        if (stats.pending > 0 && stats.pending > stats.monthlyIncome * 0.5) return 'critical';
        if (stats.pending > 0) return 'warning';
        return 'healthy';
    }, [stats]);

    const statusConfigMap = {
        healthy: {
            label: isRtl ? 'מצב פיננסי מצוין' : 'Financial Health: Excellent',
            icon: CheckCircle2,
            color: STATUS_COLORS.healthy,
            message: isRtl ? 'כל התשלומים התקבלו בזמן.' : 'All payments collected on time.'
        },
        warning: {
            label: isRtl ? 'נדרשת תשומת לב' : 'Attention Needed',
            icon: AlertTriangle,
            color: STATUS_COLORS.warning,
            message: isRtl ? `נבחנו תשלומים ממתינים בסך ${stats.pending.toLocaleString()} ₪` : `${stats.pending.toLocaleString()} pending payments detected.`
        },
        critical: {
            label: isRtl ? 'פעולה נדרשת מיידית' : 'Action Required',
            icon: AlertTriangle,
            color: STATUS_COLORS.critical,
            message: isRtl ? 'עיכוב משמעותי בגבייה החודש.' : 'Significant delay in collection this month.'
        },
        neutral: {
            label: isRtl ? 'אין צפי תשלומים' : 'No Expected Payments',
            icon: DollarSign,
            color: 'bg-slate-400 shadow-slate-400/20 text-slate-50 dark:bg-slate-600',
            message: isRtl ? 'טרם הוזנו או נרשמו תשלומים לחודש זה.' : 'No payments expected or recorded for this month.'
        }
    };

    const statusConfig = statusConfigMap[healthStatus];

    return (
        <Card className="h-full rounded-2xl overflow-hidden border-none shadow-premium relative group flex flex-col justify-start">
            
            {/* Widget Header for Collapsing */}
            <div 
                className="flex justify-between items-center p-4 md:p-6 cursor-pointer select-none group/header relative z-20"
                onClick={toggleExpand}
            >
                <div className="flex items-center gap-2 sm:gap-4">
                    <div className="p-2 bg-slate-100 dark:bg-neutral-800 rounded-xl shrink-0">
                        <DollarSign className={cn("w-5 h-5", healthStatus === 'neutral' ? "text-slate-500" : "text-emerald-500")} />
                    </div>
                    <h3 className="text-xl font-black font-heading text-primary">
                        {isRtl ? 'מצב פיננסי' : 'Financial Health'}
                    </h3>
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-muted-foreground/50 group-hover/header:text-foreground transition-colors p-1">
                        <ChevronDown className={cn("w-5 h-5 transition-transform duration-300", isExpanded ? "rotate-180" : "rotate-0")} />
                    </div>
                </div>
            </div>

            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden relative z-10 flex-1 flex flex-col"
                    >
                        <CardContent className="p-6 md:p-8 pt-0 md:pt-0 relative z-10 flex-1 flex flex-col justify-end">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">

                                {/* Traffic Light Indicator (Mobile First: Top Prominence) */}
                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <div className={cn(
                                        "w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500",
                                        statusConfig.color
                                    )}>
                                        <statusConfig.icon className="w-8 h-8" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-heading font-bold text-foreground leading-tight">
                                            {statusConfig.label}
                                        </h3>
                                        <p className="text-sm text-muted-foreground font-medium">
                                            {statusConfig.message}
                                        </p>
                                    </div>
                                </div>

                                {/* Financial Stats (Stacked for Mobile) */}
                                <div className="grid grid-cols-2 gap-4 w-full md:w-auto mt-4 md:mt-0 bg-white/50 dark:bg-black/20 p-4 rounded-xl backdrop-blur-sm border border-black/5 dark:border-white/5">
                                    <div className="space-y-1">
                                        <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                                            {isRtl ? 'צפי חודשי' : 'Forecast'}
                                        </span>
                                        <div className="flex items-center gap-1 text-foreground font-bold text-xl opacity-80" dir="ltr">
                                            <span className="font-sans">{stats.monthlyIncome.toLocaleString()}</span>
                                            <span>₪</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1 border-s border-black/10 dark:border-white/10 ps-4">
                                        <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                                            {isRtl ? 'שולם החודש' : 'Collected'}
                                        </span>
                                        <div className="flex items-center gap-1 text-secondary font-bold text-xl" dir="ltr">
                                            <span className="font-sans">{stats.collected.toLocaleString()}</span>
                                            <span>₪</span>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </CardContent>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    );
}
