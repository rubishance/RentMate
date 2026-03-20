import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import {
    BanknotesIcon,
    UsersIcon,
    ArrowTrendingUpIcon,
    ServerIcon,
    ShieldCheckIcon,
    LockClosedIcon,
    MegaphoneIcon
} from '@heroicons/react/24/outline';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line
} from 'recharts';
import { Loader2 } from 'lucide-react';

interface FinancialMetrics {
    total_users: number;
    active_subscribers: number;
    new_users_30d: number;
    mrr: number;
    total_revenue: number;
    avg_revenue_per_user: number;
    storage: {
        total_mb: number;
        media_mb: number;
        docs_mb: number;
    };
    system_status: {
        maintenance_mode: boolean;
        ai_disabled: boolean;
    };
}

export default function OwnerDashboard() {
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
    const [growthData, setGrowthData] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [activeBroadcasts, setActiveBroadcasts] = useState<number>(0);
    const [toggling, setToggling] = useState<string | null>(null);

    useEffect(() => {
        fetchMetrics();
        fetchBroadcastCount();
    }, []);

    const fetchMetrics = async () => {
        try {
            const { data, error } = await supabase.rpc('get_financial_metrics');

            if (error) throw error;
            setMetrics(data as FinancialMetrics);

            // Fetch historical growth data (graceful fallback if RPC doesn't exist yet)
            const growthRes = await supabase.rpc('get_historical_growth', { p_months: 6 });
            if (!growthRes.error && Array.isArray(growthRes.data)) {
                setGrowthData(growthRes.data);
            }
        } catch (err: unknown) {
            console.error('Error fetching owner metrics:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const fetchBroadcastCount = async () => {
        const { count } = await supabase
            .from('system_broadcasts')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);
        setActiveBroadcasts(count || 0);
    };

    const toggleSystemSetting = async (key: string, currentVal: boolean) => {
        setToggling(key);
        try {
            const { error } = await supabase
                .from('system_settings')
                .update({ value: !currentVal })
                .eq('key', key);

            if (error) throw error;
            await fetchMetrics(); // Refresh to get updated status
        } catch (err: unknown) {
            alert('Failed to toggle setting: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setToggling(null);
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-center space-y-4">
                <div className="p-4 bg-red-50 rounded-full">
                    <LockClosedIcon className="w-12 h-12 text-destructive" />
                </div>
                <h2 className="text-2xl font-bold text-foreground dark:text-white">Access Denied</h2>
                <p className="text-muted-foreground max-w-md">
                    This area is restricted to Super Administrators (Owners).
                    <br />Error: {error}
                </p>
            </div>
        );
    }



    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-600 tracking-tight">
                        Owner Control Center
                    </h1>
                    <span className="px-2 py-1 text-xs font-black bg-black text-white rounded uppercase tracking-widest">
                        GOD MODE
                    </span>
                </div>
                <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                    Financial intelligence, strategic growth, and system integrity.
                </p>
            </div>

            {/* Financial Pulse Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-border dark:border-gray-700 shadow-xl shadow-primary-500/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <BanknotesIcon className="w-24 h-24 text-primary-600" />
                    </div>
                    <div className="relative">
                        <div className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Monthly Recurring Revenue</div>
                        <div className="text-4xl font-black text-foreground dark:text-white mb-2">
                            ₪{metrics?.mrr?.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1 text-xs font-bold text-blue-500">
                            <ArrowTrendingUpIcon className="w-4 h-4" />
                            <span>+12.5%</span>
                            <span className="text-gray-300 ml-1">vs last month</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-border dark:border-gray-700 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <UsersIcon className="w-24 h-24 text-primary" />
                    </div>
                    <div className="relative">
                        <div className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Active Subscribers</div>
                        <div className="text-4xl font-black text-foreground dark:text-white mb-2">
                            {metrics?.active_subscribers}
                        </div>
                        <div className="text-xs font-bold text-primary">
                            {metrics ? ((metrics.active_subscribers / metrics.total_users) * 100).toFixed(1) : '0'}% Conversion Rate
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-border dark:border-gray-700 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <UsersIcon className="w-24 h-24 text-primary" />
                    </div>
                    <div className="relative">
                        <div className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Total Users</div>
                        <div className="text-4xl font-black text-foreground dark:text-white mb-2">
                            {metrics?.total_users}
                        </div>
                        <div className="text-xs font-bold text-primary">
                            +{metrics?.new_users_30d} New (30d)
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-border dark:border-gray-700 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <ServerIcon className="w-24 h-24 text-blue-600" />
                    </div>
                    <div className="relative">
                        <div className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">System Health</div>
                        <div className="text-4xl font-black text-blue-500 mb-2">
                            100%
                        </div>
                        <div className="text-xs font-bold text-muted-foreground">
                            All Systems Operational
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Growth Chart */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-border dark:border-gray-700 shadow-sm">
                    <h3 className="text-sm font-black text-foreground dark:text-white uppercase tracking-tight mb-6">User Growth & Revenue</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={growthData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="left" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Line yAxisId="left" type="monotone" dataKey="users" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                                <Line yAxisId="right" type="monotone" dataKey="mrr" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Quick Actions / System Status */}
                <div className="space-y-6">
                    <div className="bg-foreground text-white p-6 rounded-3xl shadow-2xl relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-lg font-black uppercase tracking-tight mb-2">Technical Infrastructure</h3>
                            <div className="space-y-3">
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs font-black uppercase tracking-widest text-blue-400">Database & API</span>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
                                            <span className="text-xs font-mono text-blue-400">HEALTHY</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-muted-foreground">STORAGE USAGE ({metrics?.storage?.total_mb?.toFixed(1) || '0'} MB)</span>
                                            <span className="text-white">{metrics?.storage?.total_mb ? ((metrics.storage.total_mb / 5000) * 100).toFixed(1) : '0'}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden flex">
                                            <div
                                                className="bg-primary-500 h-full transition-all duration-500"
                                                style={{ width: `${metrics?.storage?.total_mb ? (metrics.storage.media_mb / (metrics.storage.total_mb || 1)) * 100 : 0}%` }}
                                            />
                                            <div
                                                className="bg-primary h-full transition-all duration-500"
                                                style={{ width: `${metrics?.storage?.total_mb ? (metrics.storage.docs_mb / (metrics.storage.total_mb || 1)) * 100 : 0}%` }}
                                            />
                                        </div>
                                        <div className="flex gap-4 pt-1">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary-500"></div>
                                                <span className="text-xs font-black uppercase text-muted-foreground">Media ({metrics?.storage?.media_mb?.toFixed(1)} MB)</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                                                <span className="text-xs font-black uppercase text-muted-foreground">Docs ({metrics?.storage?.docs_mb?.toFixed(1)} MB)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        disabled={toggling === 'maintenance_mode'}
                                        onClick={() => toggleSystemSetting('maintenance_mode', metrics?.system_status?.maintenance_mode || false)}
                                        className={cn(
                                            "p-4 rounded-2xl border transition-all flex flex-col gap-2 text-left relative overflow-hidden group",
                                            metrics?.system_status?.maintenance_mode
                                                ? "bg-red-500 border-red-600 text-white shadow-lg shadow-red-500/20"
                                                : "bg-muted/50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10"
                                        )}
                                    >
                                        <div className="flex justify-between items-center">
                                            <ShieldCheckIcon className={cn("w-5 h-5", metrics?.system_status?.maintenance_mode ? "text-white" : "text-slate-500 dark:text-muted-foreground")} />
                                            {toggling === 'maintenance_mode' && <Loader2 className="w-3 h-3 animate-spin" />}
                                        </div>
                                        <div className="text-xs font-black uppercase tracking-widest">Maintenance Control</div>
                                        <div className="text-xs font-bold opacity-90 uppercase">
                                            {metrics?.system_status?.maintenance_mode ? 'APP IS LOCKED' : 'RELEASE APP'}
                                        </div>
                                    </button>

                                    <button
                                        disabled={toggling === 'disable_ai_processing'}
                                        onClick={() => toggleSystemSetting('disable_ai_processing', metrics?.system_status?.ai_disabled || false)}
                                        className={cn(
                                            "p-4 rounded-2xl border transition-all flex flex-col gap-2 text-left relative overflow-hidden group",
                                            metrics?.system_status?.ai_disabled
                                                ? "bg-amber-500 border-amber-600 text-white shadow-lg shadow-amber-500/20"
                                                : "bg-muted/50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10"
                                        )}
                                    >
                                        <div className="flex justify-between items-center">
                                            <ServerIcon className={cn("w-5 h-5", metrics?.system_status?.ai_disabled ? "text-white" : "text-slate-500 dark:text-muted-foreground")} />
                                            {toggling === 'disable_ai_processing' && <Loader2 className="w-3 h-3 animate-spin" />}
                                        </div>
                                        <div className="text-xs font-black uppercase tracking-widest">AI Kill-Switch</div>
                                        <div className="text-xs font-bold opacity-90 uppercase">
                                            {metrics?.system_status?.ai_disabled ? 'AI IS HEATED' : 'FREEZE AI'}
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                        {/* Abstract background blobs */}
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary-500/30 rounded-full blur-3xl"></div>
                        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary/30 rounded-full blur-3xl"></div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-border dark:border-gray-700 shadow-sm relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-sm font-black text-foreground dark:text-white uppercase tracking-tight">Active Broadcasts</h3>
                                <p className="text-xs text-muted-foreground uppercase font-bold mt-1">Global System Messages</p>
                            </div>
                            <MegaphoneIcon className="w-6 h-6 text-primary-600" />
                        </div>

                        <div className="flex items-end justify-between">
                            <div className="text-4xl font-black text-foreground dark:text-white">
                                {activeBroadcasts}
                            </div>
                            <Link
                                to="/admin/broadcasts"
                                className="text-xs font-black uppercase tracking-widest text-primary-600 hover:text-primary-700 flex items-center gap-1 group-hover:gap-2 transition-all"
                            >
                                Manage Announcements
                                <span>→</span>
                            </Link>
                        </div>
                        <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-primary-500/5 rounded-full group-hover:scale-150 transition-transform"></div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-border dark:border-gray-700 shadow-sm">
                        <h3 className="text-sm font-black text-foreground dark:text-white uppercase tracking-tight mb-4">Admin Privileges</h3>
                        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800">
                            <ShieldCheckIcon className="w-6 h-6 text-amber-600" />
                            <div>
                                <div className="text-xs font-bold text-amber-800 dark:text-amber-400">Super Admin Active</div>
                                <div className="text-xs text-amber-600 dark:text-amber-500">You have full access to financial data.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
