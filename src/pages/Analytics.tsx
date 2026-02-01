import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../hooks/useTranslation';
import { cn } from '../lib/utils';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { TrendingUp, DollarSign, Home, BarChart2 } from 'lucide-react';
import { subMonths, startOfMonth, format } from 'date-fns';

export function Analytics({ embedMode = false }: { embedMode?: boolean }) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [revenueData, setRevenueData] = useState<any[]>([]);
    const [paymentStatusData, setPaymentStatusData] = useState<any[]>([]);
    const [metrics, setMetrics] = useState({
        totalRevenue: 0,
        avgRent: 0,
        occupancyRate: 0,
        totalProperties: 0
    });

    useEffect(() => {
        fetchAnalyticsData();
    }, []);

    const fetchAnalyticsData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Payments for Revenue Trend
            const oneYearAgo = startOfMonth(subMonths(new Date(), 11));

            const { data: payments } = await supabase
                .from('payments')
                .select('amount, due_date, status')
                .eq('user_id', user.id)
                .gte('due_date', oneYearAgo.toISOString())
                .order('due_date', { ascending: true });

            // Process monthly revenue (only paid)
            const monthlyRevenue = new Map<string, number>();
            let totalRev = 0;

            for (let i = 0; i < 12; i++) {
                const d = new Date(oneYearAgo);
                d.setMonth(d.getMonth() + i);
                const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
                monthlyRevenue.set(key, 0);
            }

            payments?.forEach(p => {
                if (p.status === 'paid') {
                    const date = new Date(p.due_date);
                    const key = date.toLocaleString('default', { month: 'short', year: '2-digit' });
                    if (monthlyRevenue.has(key)) {
                        monthlyRevenue.set(key, (monthlyRevenue.get(key) || 0) + Number(p.amount));
                    }
                    totalRev += Number(p.amount);
                }
            });

            const revChartData = Array.from(monthlyRevenue.entries()).map(([name, value]) => ({
                name,
                revenue: value
            }));

            // 2. Payment Status Breakdown
            const statusCounts = {
                paid: 0,
                pending: 0,
                overdue: 0
            };

            payments?.forEach(p => {
                if (p.status === 'paid') statusCounts.paid++;
                else if (p.status === 'pending') statusCounts.pending++;
                else if (p.status === 'overdue') statusCounts.overdue++;
            });

            const paymentStatusChart = [
                { name: t('paid'), value: statusCounts.paid, color: '#10b981' },
                { name: t('pending'), value: statusCounts.pending, color: '#f59e0b' },
                { name: t('overdue'), value: statusCounts.overdue, color: '#ef4444' }
            ];

            // 3. Fetch Properties & Contracts for Occupancy
            const { data: properties } = await supabase
                .from('properties')
                .select('id, address')
                .eq('user_id', user.id);

            const { data: contracts } = await supabase
                .from('contracts')
                .select('base_rent, property_id, status, start_date, end_date')
                .eq('user_id', user.id);

            const totalProps = properties?.length || 0;
            const today = format(new Date(), 'yyyy-MM-dd');
            const activeContracts = contracts?.filter(c =>
                c.status === 'active' &&
                c.start_date <= today &&
                (!c.end_date || c.end_date >= today)
            ) || [];
            const occupiedProps = new Set(activeContracts.map(c => c.property_id)).size;
            const occupancyRate = totalProps > 0 ? Math.round((occupiedProps / totalProps) * 100) : 0;

            // 5. Calculate Avg Rent
            let totalRent = 0;
            activeContracts.forEach(c => {
                totalRent += Number(c.base_rent);
            });

            setMetrics({
                totalRevenue: totalRev,
                avgRent: activeContracts.length ? Math.round(totalRent / activeContracts.length) : 0,
                occupancyRate,
                totalProperties: totalProps
            });

            setRevenueData(revChartData);
            setPaymentStatusData(paymentStatusChart);

        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            </div>
        );
    }

    return (
        <div className={cn("pb-40 pt-16 space-y-20 animate-in fade-in slide-in-from-bottom-6 duration-700", !embedMode && "px-8")}>
            {/* Header */}
            {!embedMode && (
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-neutral-900 rounded-full border border-slate-100 dark:border-neutral-800 shadow-minimal">
                            <BarChart2 className="w-3 h-3 text-muted-foreground" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{t('performanceTracking')}</span>
                        </div>
                        <h1 className="text-6xl font-black tracking-tighter text-foreground lowercase">
                            {t('analytics')}
                        </h1>
                    </div>
                </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                    { label: t('totalRevenueLTM'), value: metrics.totalRevenue, icon: TrendingUp, color: 'text-emerald-500', isCurrency: true, trend: '+12% vs last year' },
                    { label: t('avgRentPerProperty'), value: metrics.avgRent, icon: DollarSign, color: 'text-primary', isCurrency: true },
                    { label: t('occupancyRate'), value: metrics.occupancyRate, icon: Home, color: 'text-amber-500', isPercentage: true },
                    { label: t('totalProperties'), value: metrics.totalProperties, icon: Home, color: 'text-foreground' }
                ].map((m, i) => (
                    <div key={i} className="p-10 bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 rounded-[2.5rem] shadow-minimal group hover:shadow-premium transition-all duration-700 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="w-14 h-14 bg-slate-50 dark:bg-neutral-900 rounded-2xl flex items-center justify-center shadow-minimal group-hover:scale-110 group-hover:rotate-3 transition-all duration-700">
                                <m.icon className={cn("w-6 h-6", m.color)} />
                            </div>
                            {m.trend && (
                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-full">{m.trend}</span>
                            )}
                        </div>
                        <div>
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40 block mb-2">{m.label}</span>
                            <h3 className="text-4xl font-black text-foreground tracking-tighter lowercase">
                                {m.isCurrency && '₪'}
                                {m.value.toLocaleString()}
                                {m.isPercentage && '%'}
                            </h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Revenue Trend Chart */}
                <div className="bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 rounded-[3rem] p-12 shadow-minimal hover:shadow-premium transition-all duration-700 space-y-12">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary mb-2 block">{t('performance')}</span>
                            <h3 className="text-3xl font-black text-foreground tracking-tighter lowercase">{t('revenueTrend')}</h3>
                        </div>
                        <select className="bg-slate-50 dark:bg-neutral-800 text-[9px] font-black uppercase tracking-widest text-muted-foreground border-none outline-none cursor-pointer px-4 py-2 rounded-full shadow-minimal">
                            <option>{t('last12Months')}</option>
                        </select>
                    </div>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" opacity={0.5} />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
                                    tickFormatter={(value) => `₪${value / 1000}k`}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '2rem', border: 'none', boxShadow: '0 20px 50px -10px rgb(0 0 0 / 0.1)', background: '#fff' }}
                                    formatter={(value: any) => [`₪${Number(value).toLocaleString()}`, t('revenue')]}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#3b82f6"
                                    strokeWidth={4}
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                    animationDuration={2000}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Status Breakdown Chart */}
                <div className="bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 rounded-[3rem] p-12 shadow-minimal hover:shadow-premium transition-all duration-700 space-y-12">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-500 mb-2 block">{t('collection')}</span>
                            <h3 className="text-3xl font-black text-foreground tracking-tighter lowercase">{t('paymentStatus')}</h3>
                        </div>
                    </div>
                    <div className="h-[350px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={paymentStatusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={120}
                                    paddingAngle={8}
                                    dataKey="value"
                                    animationDuration={1500}
                                >
                                    {paymentStatusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '2rem', border: 'none', boxShadow: '0 20px 50px -10px rgb(0 0 0 / 0.1)', background: '#fff' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-4xl font-black text-foreground tracking-tighter">
                                {paymentStatusData.reduce((acc, curr) => acc + curr.value, 0)}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40">{t('totalUnits')}</span>
                        </div>
                    </div>
                    {/* Legend Custom */}
                    <div className="flex justify-center gap-10">
                        {paymentStatusData.map((s, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{s.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
