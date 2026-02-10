import { useState, useEffect } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { supabase } from '../../lib/supabase';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import {
    BarChart3, Users, Activity, MousePointer2, TrendingUp, Calendar,
    ChevronRight, ArrowUpRight, Search, Filter, Download,
    LayoutDashboard, FileText, Settings, Database, Server
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn, formatDate, formatNumber } from '../../lib/utils';

interface UsageStats {
    top_users: {
        user_id: string;
        email: string;
        event_count: number;
    }[];
    feature_popularity: {
        event_name: string;
        usage_count: number;
    }[];
    daily_activity: {
        day: string;
        count: number;
    }[];
}

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];

export default function UsageAnalytics() {
    const { t } = useTranslation();
    const [stats, setStats] = useState<UsageStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeRange, setTimeRange] = useState(30);

    useEffect(() => {
        fetchStats();
    }, [timeRange]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const { data, error: rpcError } = await supabase.rpc('get_global_usage_stats', {
                days_limit: timeRange
            });

            if (rpcError) throw rpcError;
            setStats(data);
        } catch (err: any) {
            console.error('Error fetching usage stats:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Activity className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/20">
                <Database className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-red-900 dark:text-red-400 mb-2">Failed to Load Analytics</h3>
                <p className="text-red-600 dark:text-red-500/70 mb-6">{error}</p>
                <button
                    onClick={fetchStats}
                    className="px-6 py-2 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <Activity className="w-8 h-8 text-indigo-500" />
                        Usage Analytics
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Track feature adoption and user engagement across the platform.
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-slate-100 dark:bg-neutral-800 p-1 rounded-2xl border border-slate-200 dark:border-neutral-700">
                    {[7, 30, 90, 365].map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={cn(
                                "px-4 py-1.5 rounded-xl text-xs font-bold transition-all",
                                timeRange === range
                                    ? "bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                            )}
                        >
                            {range === 365 ? '1 Year' : `${range} Days`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Top Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    title="Total Events"
                    value={formatNumber(stats?.daily_activity.reduce((acc, curr) => acc + curr.count, 0) || 0)}
                    icon={<Activity className="w-5 h-5" />}
                    trend="+12%" // Placeholder trend
                    color="indigo"
                />
                <MetricCard
                    title="Active Users"
                    value={formatNumber(stats?.top_users.length || 0)}
                    icon={<Users className="w-5 h-5" />}
                    trend="+5%"
                    color="violet"
                />
                <MetricCard
                    title="Top Feature"
                    value={stats?.feature_popularity[0]?.event_name.replace(/_/g, ' ') || 'N/A'}
                    icon={<MousePointer2 className="w-5 h-5" />}
                    trend="Most Used"
                    color="emerald"
                />
            </div>

            {/* Charts Row 1: Daily Activity & Feature Popularity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Daily Activity Chart */}
                <div className="bg-white dark:bg-neutral-900/50 p-6 rounded-3xl border border-slate-100 dark:border-neutral-800 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-indigo-500" />
                                Daily Activity
                            </h3>
                            <p className="text-xs text-slate-400">Total events logged per day</p>
                        </div>
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                            <Calendar className="w-4 h-4 text-indigo-600" />
                        </div>
                    </div>
                    <div className="h-[300px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats?.daily_activity || []}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="day"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    tickFormatter={(val) => {
                                        const d = new Date(val);
                                        return `${d.getDate()}/${d.getMonth() + 1}`;
                                    }}
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <RechartsTooltip
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-white dark:bg-neutral-800 p-3 rounded-xl border border-slate-200 dark:border-neutral-700 shadow-xl">
                                                    <p className="text-xs font-bold text-slate-900 dark:text-white mb-1">{label}</p>
                                                    <p className="text-indigo-600 font-black text-lg">{payload[0].value} <span className="text-xs font-normal text-slate-400">events</span></p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Feature Popularity Chart */}
                <div className="bg-white dark:bg-neutral-900/50 p-6 rounded-3xl border border-slate-100 dark:border-neutral-800 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-violet-500" />
                                Feature Adoption
                            </h3>
                            <p className="text-xs text-slate-400">Relative usage of key platform actions</p>
                        </div>
                        <div className="p-2 bg-violet-50 dark:bg-violet-900/20 rounded-xl">
                            <MousePointer2 className="w-4 h-4 text-violet-600" />
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats?.feature_popularity || []} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="event_name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                                    tickFormatter={(val) => val.replace(/_/g, ' ')}
                                    width={120}
                                />
                                <RechartsTooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-white dark:bg-neutral-800 p-3 rounded-xl border border-slate-200 dark:border-neutral-700 shadow-xl">
                                                    <p className="text-violet-600 font-black text-lg">{payload[0].value} <span className="text-xs font-normal text-slate-400">uses</span></p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar dataKey="usage_count" radius={[0, 8, 8, 0]}>
                                    {stats?.feature_popularity.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Row 2: Top Users Table */}
            <div className="bg-white dark:bg-neutral-900/50 rounded-3xl border border-slate-100 dark:border-neutral-800 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between bg-slate-50/50 dark:bg-neutral-800/30">
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-500" />
                            Most Active Users
                        </h3>
                        <p className="text-xs text-slate-400">Users with the highest event volume</p>
                    </div>
                    <button className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                        View All Users <ChevronRight className="w-3 h-3" />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-neutral-800/20">
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Rank</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">User Email</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Activity Level</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Total Events</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats?.top_users.map((user, idx) => (
                                <tr key={user.user_id} className="group hover:bg-slate-50/50 dark:hover:bg-neutral-800/20 transition-colors border-b border-slate-50 dark:border-neutral-800 last:border-0">
                                    <td className="px-8 py-4">
                                        <div className={cn(
                                            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black",
                                            idx === 0 ? "bg-amber-100 text-amber-600 shadow-sm" :
                                                idx === 1 ? "bg-slate-100 text-slate-600" :
                                                    idx === 2 ? "bg-orange-50 text-orange-600" : "text-slate-400"
                                        )}>
                                            {idx + 1}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                                {user.email.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">{user.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 max-w-[100px] bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-indigo-500 rounded-full"
                                                    style={{ width: `${(user.event_count / (stats?.top_users[0]?.event_count || 1)) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-black text-indigo-500">
                                                {Math.round((user.event_count / (stats?.top_users[0]?.event_count || 1)) * 100)}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-slate-900 dark:text-white">{formatNumber(user.event_count)}</span>
                                    </td>
                                    <td className="px-8 py-4 text-right">
                                        <button className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-400 hover:text-indigo-600 rounded-xl transition-all">
                                            <ArrowUpRight className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, icon, trend, color }: { title: string, value: string, icon: any, trend: string, color: string }) {
    const colorClasses: Record<string, string> = {
        indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400",
        violet: "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400",
        emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
    };

    return (
        <div className="bg-white dark:bg-neutral-900/50 p-6 rounded-3xl border border-slate-100 dark:border-neutral-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2.5 rounded-2xl", colorClasses[color])}>
                    {icon}
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1">
                    {trend}
                </div>
            </div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-2">{title}</h4>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                {value}
            </div>
        </div>
    );
}
