
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PageHeader } from '../components/common/PageHeader';
import { useTranslation } from '../hooks/useTranslation';

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
import { TrendingUp, DollarSign, Home, CreditCard, BarChart2 } from 'lucide-react';


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
            const oneYearAgo = new Date();
            oneYearAgo.setMonth(oneYearAgo.getMonth() - 11);
            oneYearAgo.setDate(1);

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
                .select('rent_amount, property_id, status')
                .eq('user_id', user.id);

            const totalProps = properties?.length || 0;
            const activeContracts = contracts?.filter(c => c.status === 'active') || [];
            const occupiedProps = new Set(activeContracts.map(c => c.property_id)).size;
            const occupancyRate = totalProps > 0 ? Math.round((occupiedProps / totalProps) * 100) : 0;

            // 5. Calculate Avg Rent
            let totalRent = 0;
            activeContracts.forEach(c => {
                totalRent += Number(c.rent_amount);
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
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className={`space-y-6 ${embedMode ? '' : 'px-4 pt-6'}`}>
            {!embedMode && (
                <PageHeader
                    title={t('analyticsTitle')}
                    subtitle={t('analyticsSubtitle')}
                />
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+12% {t('vsLastYear')}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{t('totalRevenueLTM')}</p>
                    <h3 className="text-2xl font-bold mt-1">
                        {new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(metrics.totalRevenue)}
                    </h3>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-primary/10 dark:bg-blue-900/20 rounded-lg">
                            <DollarSign className="w-5 h-5 text-primary dark:text-blue-400" />
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{t('avgRentPerProperty')}</p>
                    <h3 className="text-2xl font-bold mt-1">
                        {new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(metrics.avgRent)}
                    </h3>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                            <Home className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{t('occupancyRate')}</p>
                    <h3 className="text-2xl font-bold mt-1">{metrics.occupancyRate}%</h3>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                            <CreditCard className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{t('totalProperties')}</p>
                    <h3 className="text-2xl font-bold mt-1">{metrics.totalProperties}</h3>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="bg-card border border-border rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-lg">{t('revenueTrend')}</h3>
                        <select className="bg-transparent text-sm font-medium text-muted-foreground border-none outline-none cursor-pointer">
                            <option>{t('last12Months')}</option>
                        </select>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    tickFormatter={(value) => `₪${value / 1000}k`}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: any) => [new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(Number(value) || 0), t('revenue')]}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Utility Costs Chart */}
                <div className="bg-card border border-border rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-lg">Utility Expenses</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Rolling 12mo</span>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData}> {/* Placeholder using revenueData for now, but should fetch utility data */}
                                <defs>
                                    <linearGradient id="colorUtility" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    tickFormatter={(value) => `₪${value}`}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="expense"
                                    stroke="#f59e0b"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorUtility)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Payment Status */}
                <div className="bg-card border border-border rounded-2xl p-6">
                    <h3 className="font-bold text-lg mb-6">{t('paymentStatus')}</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={paymentStatusData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    dataKey="value"
                                    label={(entry) => `${entry.name}: ${entry.value}`}
                                >
                                    {paymentStatusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

        </div>
    );
}
