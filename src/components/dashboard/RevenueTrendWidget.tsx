import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import { TrendingUp, Activity, ChevronDown } from 'lucide-react';
import { subMonths, startOfMonth, format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { SegmentedControl } from '../ui/SegmentedControl';
import { useAuth } from '../../contexts/AuthContext';

interface RevenueTrendWidgetProps {
    isExpanded?: boolean;
    onToggleExpand?: () => void;
}

export function RevenueTrendWidget({ isExpanded: externalIsExpanded, onToggleExpand }: RevenueTrendWidgetProps) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [revenueData, setRevenueData] = useState<any[]>([]);
    const [period, setPeriod] = useState<3 | 6 | 12>(12);
    
    // Internal state for expansion if not controlled externally
    const [localIsExpanded, setLocalIsExpanded] = useState(true);
    const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : localIsExpanded;

    const toggleExpand = () => {
        if (onToggleExpand) {
            onToggleExpand();
        } else {
            setLocalIsExpanded(!localIsExpanded);
        }
    };

    useEffect(() => {
        const fetchAnalyticsData = async () => {
             if (!user) return;
            setLoading(true);
            try {
                const startDate = startOfMonth(subMonths(new Date(), period - 1));

                const { data: payments } = await supabase
                    .from('payments')
                    .select('amount, due_date, status')
                    .eq('user_id', user.id)
                    .gte('due_date', startDate.toISOString())
                    .order('due_date', { ascending: true });

                const monthlyRevenue = new Map<string, number>();

                for (let i = 0; i < period; i++) {
                    const d = new Date(startDate);
                    d.setMonth(d.getMonth() + i);
                    const key = format(d, 'MM/yy');
                    monthlyRevenue.set(key, 0);
                }

                payments?.forEach(p => {
                    if (p.status === 'paid') {
                        const date = new Date(p.due_date);
                        const key = format(date, 'MM/yy');
                        if (monthlyRevenue.has(key)) {
                            monthlyRevenue.set(key, (monthlyRevenue.get(key) || 0) + Number(p.amount));
                        }
                    }
                });

                const revChartData = Array.from(monthlyRevenue.entries()).map(([name, value]) => ({
                    name,
                    revenue: value
                }));

                setRevenueData(revChartData);

            } catch (error) {
                console.error('Error fetching analytics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalyticsData();
    }, [user, period]);

    if (loading) {
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
        <Card hoverEffect glass className={cn("flex flex-col h-full group/widget relative overflow-hidden transition-all duration-300", isExpanded ? "min-h-[300px]" : "")}>
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
                                <TrendingUp className="w-5 h-5 text-indigo-500" />
                            </div>
                            <CardTitle className="text-xl font-black font-heading text-primary">
                                {t('revenueTrend')}
                            </CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
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
                                <div className="flex justify-center mb-4">
                                     <SegmentedControl
                                         value={period.toString()}
                                         onChange={(val) => setPeriod(Number(val) as 3 | 6 | 12)}
                                         options={[
                                             { value: '12', label: t('12Months') || '12 חודשים' },
                                             { value: '6', label: t('6Months') || '6 חודשים' },
                                             { value: '3', label: t('3Months') || '3 חודשים' }
                                         ]}
                                     />
                                </div>
                                <div className="h-[250px] w-full mt-2">
                                     <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={revenueData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorRevenueDashboard" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-foreground/5" opacity={0.5} />
                                            <XAxis
                                                dataKey="name"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#6366f1', fontSize: 13, fontWeight: 800 }}
                                                className="lowercase"
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 700 }}
                                                className="text-muted-foreground opacity-70 lowercase"
                                                tickFormatter={(value) => {
                                                    if (value === 0) return '₪0';
                                                    if (value >= 1000) return `₪${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
                                                    return `₪${value}`;
                                                }}
                                                width={35}
                                            />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '1rem', border: '1px solid rgba(125,125,125,0.1)', boxShadow: '0 10px 30px -10px rgb(0 0 0 / 0.1)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)' }}
                                                itemStyle={{ color: '#000', fontSize: '13px', fontWeight: 900, textTransform: 'lowercase' }}
                                                formatter={(value: any) => [`₪${Number(value).toLocaleString()}`, t('revenue')]}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="revenue"
                                                stroke="#818cf8"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorRevenueDashboard)"
                                                animationDuration={1500}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </Card>
    );
}
