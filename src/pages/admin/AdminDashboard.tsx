import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    FileText,
    DollarSign,
    Activity,
    UserPlus,
    Shield,
    Settings,
    CreditCard,
    ExternalLink,
    Loader2
} from 'lucide-react';

interface DashboardStats {
    totalUsers: number;
    activeUsers: number;
    totalContracts: number;
    totalRevenue: number;
}

interface RecentActivity {
    id: string;
    action: string;
    created_at: string;
    details: any;
    user_id: string; // We might need to fetch the user name separately or join
}

interface NewUser {
    id: string;
    email: string;
    full_name: string;
    created_at: string;
}

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats>({
        totalUsers: 0,
        activeUsers: 0,
        totalContracts: 0,
        totalRevenue: 0
    });
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [newUsers, setNewUsers] = useState<NewUser[]>([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // Use the admin stats function to bypass RLS
            const { data: statsData, error: statsError } = await supabase.rpc('get_admin_stats');

            if (statsError) {
                console.error('Error fetching admin stats:', statsError);
                throw statsError;
            }

            const [logsReq, newUsersReq] = await Promise.all([
                // Recent Activity
                supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(5),
                // New Users
                supabase.from('user_profiles').select('id, email, full_name, created_at').order('created_at', { ascending: false }).limit(5)
            ]);

            setStats({
                totalUsers: statsData?.totalUsers || 0,
                activeUsers: statsData?.activeUsers || 0,
                totalContracts: statsData?.totalContracts || 0,
                totalRevenue: statsData?.totalRevenue || 0
            });

            setRecentActivity(logsReq.data as RecentActivity[] || []);
            setNewUsers(newUsersReq.data as NewUser[] || []);

        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        { name: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-brand-600', bg: 'bg-brand-50' },
        { name: 'Total Contracts', value: stats.totalContracts, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
        { name: 'Total Revenue', value: `₪${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { name: 'Active Users', value: stats.activeUsers, icon: Activity, color: 'text-orange-600', bg: 'bg-orange-50' },
    ];

    const quickLinks = [
        { name: 'Manage Users', icon: Users, path: '/admin/users', desc: 'View and edit user accounts' },
        { name: 'Manage Plans', icon: CreditCard, path: '/admin/plans', desc: 'Update subscription tiers' },
        { name: 'Audit Logs', icon: Shield, path: '/admin/audit-logs', desc: 'Review system security events' },
        { name: 'System Settings', icon: Settings, path: '/admin/settings', desc: 'Global configuration' },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                    <Activity className="w-8 h-8 text-brand-600" />
                    System Overview
                </h1>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                    Real-time platform metrics, revenue tracking, and administrative controls.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {statCards.map((item) => (
                    <div key={item.name} className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all transform hover:-translate-y-1">
                        <div className="flex items-center">
                            <div className={`rounded-xl p-3 ${item.bg} border border-brand-100 dark:border-brand-800`}>
                                <item.icon className={`h-6 w-6 ${item.color}`} />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="truncate text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{item.name}</dt>
                                    <dd className="text-2xl font-black text-gray-900 dark:text-white leading-tight">{item.value}</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Activity */}
                <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-border dark:border-gray-700 overflow-hidden">
                    <div className="px-6 py-5 border-b border-border dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                        <h3 className="text-base font-semibold leading-6 text-foreground dark:text-white flex items-center gap-2">
                            <Activity className="w-4 h-4 text-muted-foreground" />
                            Recent Activity
                        </h3>
                        <button onClick={() => navigate('/admin/audit-logs')} className="text-xs font-medium text-brand-600 hover:text-brand-500 flex items-center gap-1">
                            View All <ExternalLink className="w-3 h-3" />
                        </button>
                    </div>
                    <ul role="list" className="divide-y divide-gray-100 dark:divide-gray-700">
                        {recentActivity.length === 0 ? (
                            <li className="px-6 py-4 text-center text-sm text-muted-foreground">No recent activity</li>
                        ) : (
                            recentActivity.map((log) => (
                                <li key={log.id} className="px-6 py-4 hover:bg-secondary dark:hover:bg-gray-700/30 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div className="flex gap-3">
                                            <div className="mt-1 p-1.5 rounded-full bg-muted dark:bg-gray-700 text-muted-foreground">
                                                <Shield className="w-3 h-3" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground dark:text-white">{log.action}</p>
                                                <p className="text-xs text-muted-foreground max-w-xs truncate">
                                                    {log.user_id} • {JSON.stringify(log.details)}
                                                </p>
                                            </div>
                                        </div>
                                        <time className="text-xs text-muted-foreground whitespace-nowrap">
                                            {new Date(log.created_at).toLocaleDateString()}
                                        </time>
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                </div>

                {/* New Users */}
                <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-border dark:border-gray-700 overflow-hidden">
                    <div className="px-6 py-5 border-b border-border dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                        <h3 className="text-base font-semibold leading-6 text-foreground dark:text-white flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-muted-foreground" />
                            Newest Users
                        </h3>
                        <button onClick={() => navigate('/admin/users')} className="text-xs font-medium text-brand-600 hover:text-brand-500 flex items-center gap-1">
                            View All <ExternalLink className="w-3 h-3" />
                        </button>
                    </div>
                    <ul role="list" className="divide-y divide-gray-100 dark:divide-gray-700">
                        {newUsers.length === 0 ? (
                            <li className="px-6 py-4 text-center text-sm text-muted-foreground">No new users</li>
                        ) : (
                            newUsers.map((user) => (
                                <li key={user.id} className="px-6 py-4 hover:bg-secondary dark:hover:bg-gray-700/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="h-8 w-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-xs">
                                            {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground dark:text-white truncate">
                                                {user.full_name || 'No Name'}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {user.email}
                                            </p>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            </div>

            {/* Quick Links */}
            <div>
                <h3 className="text-lg font-medium leading-6 text-foreground dark:text-white mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {quickLinks.map((link) => (
                        <button
                            key={link.name}
                            onClick={() => navigate(link.path)}
                            className="relative flex items-center space-x-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-6 py-5 shadow-sm focus-within:ring-2 focus-within:ring-brand-500 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-secondary dark:hover:bg-gray-700/50 transition-all text-left"
                        >
                            <div className="flex-shrink-0">
                                <div className="h-10 w-10 rounded-lg bg-muted dark:bg-gray-700 flex items-center justify-center text-muted-foreground dark:text-gray-300">
                                    <link.icon className="h-6 w-6" />
                                </div>
                            </div>
                            <div className="min-w-0 flex-1">
                                <span className="absolute inset-0" aria-hidden="true" />
                                <p className="text-sm font-medium text-foreground dark:text-white">{link.name}</p>
                                <p className="truncate text-xs text-muted-foreground dark:text-muted-foreground">{link.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
