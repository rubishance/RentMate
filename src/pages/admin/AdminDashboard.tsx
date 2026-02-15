import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    FileText,
    Activity,
    UserPlus,
    Shield,
    Settings,
    CreditCard,
    ExternalLink,
    Loader2,
    Cpu,
    MessageSquare,
    Sparkles,
    Wallet
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { ActiveChatsWidget } from '../../components/crm/ActiveChatsWidget';
import { ActionInbox } from '../../components/crm/ActionInbox';
import { AutomationAnalytics } from '../../components/crm/AutomationAnalytics';

interface DashboardStats {
    totalUsers: number;
    activeUsers: number;
    totalContracts: number;
    totalRevenue: number;
    totalAiCost: number;
    totalAutomatedActions: number;
    stagnantTickets: number;
    avgSentiment: number;
    lastAutomationRun: string | null;
    topCities: { name: string; count: number }[];
}

interface RecentActivity {
    id: string;
    action: string;
    created_at: string;
    details: Record<string, unknown>;
    user_id: string;
}

interface NewUser {
    id: string;
    email: string;
    full_name: string;
    created_at: string;
}

interface Message {
    role: string;
    content: string;
}

interface AiConversation {
    id: string;
    user_id: string;
    messages: Message[];
    total_cost_usd: number;
    updated_at: string;
    user_profiles?: {
        full_name: string;
        email: string;
    };
}

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats>({
        totalUsers: 0,
        activeUsers: 0,
        totalContracts: 0,
        totalRevenue: 0,
        totalAiCost: 0,
        totalAutomatedActions: 0,
        stagnantTickets: 0,
        avgSentiment: 0,
        lastAutomationRun: null,
        topCities: []
    });
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [newUsers, setNewUsers] = useState<NewUser[]>([]);
    const [recentAiConvs, setRecentAiConvs] = useState<AiConversation[]>([]);


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
                supabase.from('user_profiles').select('id, email, full_name, created_at').order('created_at', { ascending: false }).limit(5),
                // AI Convs
                supabase.from('ai_conversations').select('*, user_profiles(full_name, email)').order('updated_at', { ascending: false }).limit(5)
            ]);

            setStats({
                totalUsers: statsData?.totalUsers || 0,
                totalContracts: statsData?.totalContracts || 0,
                totalRevenue: statsData?.totalRevenue || 0,
                activeUsers: statsData?.activeUsers || 0,
                totalAiCost: statsData?.totalAiCost || 0,
                totalAutomatedActions: statsData?.totalAutomatedActions || 0,
                stagnantTickets: statsData?.stagnantTickets || 0,
                avgSentiment: statsData?.avgSentiment || 0,
                lastAutomationRun: statsData?.lastAutomationRun || null,
                topCities: statsData?.topCities || []
            });

            setRecentActivity(logsReq.data as RecentActivity[] || []);
            setNewUsers(newUsersReq.data as NewUser[] || []);
            setRecentAiConvs((await supabase.from('ai_conversations').select('*, user_profiles(full_name, email)').order('updated_at', { ascending: false }).limit(5)).data as AiConversation[] || []);



        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        { name: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-brand-600', bg: 'bg-brand-50' },
        { name: 'Total Contracts', value: stats.totalContracts, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
        { name: 'Total Revenue', value: stats.totalRevenue ? `₪${stats.totalRevenue.toLocaleString()}` : '₪0', icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { name: 'Active Users', value: stats.activeUsers, icon: Activity, color: 'text-orange-600', bg: 'bg-orange-50' },
        { name: 'AI Usage Cost', value: stats.totalAiCost ? `$${stats.totalAiCost.toFixed(2)}` : '$0.00', icon: Cpu, color: 'text-blue-600', bg: 'bg-blue-50' },
        { name: 'Autopilot Decisions', value: stats.totalAutomatedActions, icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-50' },
    ];

    const quickLinks = [
        { name: 'Manage Users', icon: Users, path: '/admin/users', desc: 'View and edit user accounts' },
        { name: 'Manage Plans', icon: CreditCard, path: '/admin/plans', desc: 'Update subscription tiers' },
        { name: 'Audit Logs', icon: Shield, path: '/admin/audit-logs', desc: 'Review system security events' },
        { name: 'Usage Analytics', icon: Activity, path: '/admin/usage', desc: 'Track platform adoption' },
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
            {/* Header omitted for brevity in replace call, but keeping logic */}
            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

            {/* Automation Intelligence (New) */}
            <AutomationAnalytics stats={stats} />

            {/* Active Chats Widget */}
            <div className="h-80">
                <ActiveChatsWidget />
            </div>

            {/* AI Action Inbox (New) */}
            <div className="grid grid-cols-1 gap-8">
                <ActionInbox />
            </div>

            {/* Top Cities Distribution */}
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-border dark:border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-6">
                    <Activity className="w-5 h-5 text-brand-600" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Top 10 Cities By Properties</h3>
                </div>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.topCities} layout="vertical" margin={{ left: 40, right: 30, top: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.1} />
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={100}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                            />
                            <Bar
                                dataKey="count"
                                fill="#7C3AED"
                                radius={[0, 4, 4, 0]}
                                barSize={20}
                                label={{ position: 'right', fill: '#64748B', fontSize: 11, fontWeight: 700 }}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Activity */}
                <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-border dark:border-gray-700 overflow-hidden">
                    <div className="px-6 py-5 border-b border-border dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                        <h3 className="text-base font-semibold leading-6 text-foreground dark:text-white flex items-center gap-2">
                            <Activity className="w-4 h-4 text-muted-foreground" />
                            Recent Activity
                        </h3>
                        <Button
                            variant="link"
                            size="sm"
                            onClick={() => navigate('/admin/audit-logs')}
                            className="text-xs font-medium text-brand-600 hover:text-brand-500 flex items-center gap-1 p-0 h-auto"
                        >
                            View All <ExternalLink className="w-3 h-3" />
                        </Button>
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
                        <Button
                            variant="link"
                            size="sm"
                            onClick={() => navigate('/admin/users')}
                            className="text-xs font-medium text-brand-600 hover:text-brand-500 flex items-center gap-1 p-0 h-auto"
                        >
                            View All <ExternalLink className="w-3 h-3" />
                        </Button>
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

            {/* AI Conversations */}
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-border dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-5 border-b border-border dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                    <h3 className="text-base font-semibold leading-6 text-foreground dark:text-white flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground" />
                        Latest AI Conversations
                    </h3>
                    <Button
                        variant="link"
                        size="sm"
                        onClick={() => navigate('/admin/conversations')}
                        className="text-xs font-medium text-brand-600 hover:text-brand-500 flex items-center gap-1 p-0 h-auto"
                    >
                        View Analytics <ExternalLink className="w-3 h-3" />
                    </Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Message</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Sync</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {recentAiConvs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500">No AI conversations logged yet.</td>
                                </tr>
                            ) : (
                                recentAiConvs.map((conv) => (
                                    <tr key={conv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="ml-0">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {conv.user_profiles?.full_name || 'Anonymous User'}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{conv.user_profiles?.email || 'No email'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 dark:text-gray-300 max-w-sm truncate">
                                                {conv.messages[conv.messages.length - 1]?.content || 'No messages'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                ${conv.total_cost_usd?.toFixed(3)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                                            {new Date(conv.updated_at).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quick Links */}
            <div>
                <h3 className="text-lg font-medium leading-6 text-foreground dark:text-white mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {quickLinks.map((link) => (
                        <Button
                            key={link.name}
                            onClick={() => navigate(link.path)}
                            variant="ghost"
                            className="relative flex items-center space-x-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-6 py-5 shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-secondary dark:hover:bg-gray-700/50 transition-all text-left h-auto w-full justify-start"
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
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
