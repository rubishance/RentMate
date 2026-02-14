import { useMemo } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { cn } from '../../lib/utils';
import { TrendingUp, AlertTriangle, CheckCircle2, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';

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
}

export function FinancialHealthWidget({ stats }: FinancialHealthWidgetProps) {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'he';

    const healthStatus = useMemo(() => {
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
        }
    };

    const statusConfig = statusConfigMap[healthStatus];

    return (
        <Card className="overflow-hidden border-none shadow-premium relative group">
            {/* Background Pattern - Mid Century Abstract */}
            <div className={cn(
                "absolute inset-0 opacity-10 pointer-events-none transition-colors duration-500",
                statusConfig.color.replace('text', 'bg').replace('shadow', 'fill')
            )}>
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
            </div>

            <CardContent className="p-6 md:p-8 relative z-10">
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
                            <h3 className="text-lg md:text-xl font-heading font-bold text-foreground leading-tight">
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
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                                {isRtl ? 'נאסף החודש' : 'Collected'}
                            </span>
                            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xl">
                                <span>₪</span>
                                <span>{stats.collected.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="space-y-1 border-s border-black/10 dark:border-white/10 ps-4">
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                                {isRtl ? 'צפי חודשי' : 'Forecast'}
                            </span>
                            <div className="flex items-center gap-1 text-foreground font-bold text-xl opacity-80">
                                <span>₪</span>
                                <span>{stats.monthlyIncome.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Progress Bar */}
                <div className="mt-8 relative h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((stats.collected / (stats.monthlyIncome || 1)) * 100, 100)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={cn(
                            "absolute top-0 bottom-0 left-0 rounded-full",
                            healthStatus === 'healthy' ? 'bg-emerald-500' :
                                healthStatus === 'warning' ? 'bg-amber-500' : 'bg-rose-500'
                        )}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
