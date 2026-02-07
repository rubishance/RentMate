import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    MessageSquare,
    Users,
    TrendingUp,
    Settings,
    Save,
    AlertCircle,
    Loader2
} from 'lucide-react';
import {
    ArrowPathIcon
} from '@heroicons/react/24/outline';

interface UsageLimit {
    id: string;
    tier_name: string;
    monthly_message_limit: number;
    monthly_token_limit: number;
    monthly_whatsapp_limit: number;
}

interface UserUsage {
    user_id: string;
    message_count: number;
    tokens_used: number;
    last_reset_at: string;
    user_email?: string;
    subscription_tier?: string;
    whatsapp_messages?: number;
}

export default function AIUsageManagement() {
    const [limits, setLimits] = useState<UsageLimit[]>([]);
    const [usage, setUsage] = useState<UserUsage[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editedLimits, setEditedLimits] = useState<Record<string, UsageLimit>>({});
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch limits
            const { data: limitsData, error: limitsError } = await supabase
                .from('ai_usage_limits')
                .select('*')
                .order('tier_name');

            if (limitsError) throw limitsError;
            setLimits(limitsData || []);

            // Fetch usage with user details
            const { data: usageData, error: usageError } = await supabase
                .from('ai_chat_usage')
                .select(`
                    *,
                    user_profiles!inner(email, plan_id)
                `)
                .order('message_count', { ascending: false })
                .limit(50);

            if (usageError) throw usageError;

            // Fetch WhatsApp usage summary per user
            const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
            const { data: waUsageData } = await supabase
                .from('whatsapp_usage_logs')
                .select('user_id')
                .gte('created_at', monthStart);

            const waCountMap = (waUsageData || []).reduce((acc: any, curr: any) => {
                acc[curr.user_id] = (acc[curr.user_id] || 0) + 1;
                return acc;
            }, {});

            interface RawUsageData {
                user_id: string;
                message_count: number;
                tokens_used: number;
                last_reset_at: string;
                user_profiles: {
                    email: string;
                    plan_id: string;
                } | null;
            }

            const formattedUsage = (usageData as unknown as RawUsageData[])?.map((u) => ({
                user_id: u.user_id,
                message_count: u.message_count,
                tokens_used: u.tokens_used,
                last_reset_at: u.last_reset_at,
                user_email: u.user_profiles?.email,
                subscription_tier: u.user_profiles?.plan_id,
                whatsapp_messages: waCountMap[u.user_id] || 0
            })) || [];

            setUsage(formattedUsage);
        } catch (err: unknown) {
            console.error('Error fetching AI usage data:', err);
            setError(err instanceof Error ? err.message : 'Failed to load AI usage statistics');
        } finally {
            setLoading(false);
        }
    };

    const handleLimitChange = (tierId: string, field: 'monthly_message_limit' | 'monthly_token_limit' | 'monthly_whatsapp_limit', value: string) => {
        const limit = limits.find(l => l.id === tierId);
        if (!limit) return;

        const numValue = value === '-1' ? -1 : parseInt(value) || 0;

        setEditedLimits(prev => ({
            ...prev,
            [tierId]: {
                ...limit,
                ...prev[tierId],
                [field]: numValue
            }
        }));
    };

    const saveLimits = async () => {
        setSaving(true);
        try {
            const updates = Object.values(editedLimits);

            for (const limit of updates) {
                const { error } = await supabase
                    .from('ai_usage_limits')
                    .update({
                        monthly_message_limit: limit.monthly_message_limit,
                        monthly_token_limit: limit.monthly_token_limit,
                        monthly_whatsapp_limit: limit.monthly_whatsapp_limit,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', limit.id);

                if (error) throw error;
            }

            setEditedLimits({});
            fetchData();
        } catch (err: unknown) {
            console.error('Error saving limits:', err);
            alert('Failed to save limits: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setSaving(false);
        }
    };

    const getTierColor = (tier: string) => {
        switch (tier?.toLowerCase()) {
            case 'pro': return 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:border-purple-800';
            case 'business': return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800';
            case 'basic': return 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800';
            default: return 'bg-gray-50 text-gray-700 border-gray-100 dark:bg-gray-900/40 dark:border-gray-700 dark:text-gray-400';
        }
    };

    const getUsagePercentage = (used: number, limit: number) => {
        if (limit === -1) return 0; // Unlimited
        return Math.min((used / limit) * 100, 100);
    };

    const totalMessages = usage.reduce((sum, u) => sum + u.message_count, 0);
    const totalTokens = usage.reduce((sum, u) => sum + u.tokens_used, 0);
    const totalWhatsApp = usage.reduce((sum, u) => sum + (u.whatsapp_messages || 0), 0);
    const activeUsers = usage.filter(u => u.message_count > 0 || (u.whatsapp_messages || 0) > 0).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <TrendingUp className="w-8 h-8 text-brand-600" />
                        AI Usage Dashboard
                    </h1>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                        Monitor and control AI chatbot resource consumption across subscription tiers.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        className="p-2.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
                    >
                        <ArrowPathIcon className="w-6 h-6" />
                    </button>
                    {Object.keys(editedLimits).length > 0 && (
                        <button
                            onClick={saveLimits}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-bold shadow-lg shadow-brand-600/20 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Save Changes
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-2xl flex items-center gap-3 text-red-700 dark:text-red-400 font-bold text-sm">
                    <AlertCircle className="w-6 h-6 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                            <MessageSquare className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Total Messages</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white">{totalMessages.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
                            <TrendingUp className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Tokens Used</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white">{(totalTokens / 1000).toFixed(1)}K</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800">
                            <Users className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Active Chatters</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white">{activeUsers}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800">
                            <ArrowPathIcon className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">WhatsApp Sent</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white">{totalWhatsApp.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tier Configuration Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <h2 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">Subscription Tier Quotas</h2>
                    <p className="text-xs font-medium text-gray-500 mt-1">Adjust limits per user tier. Use -1 for unlimited access.</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right" dir="rtl">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/30">
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Pricing Tier</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">AI Msg / Mo</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">AI Token / Mo</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">WhatsApp / Mo</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Est. AI Cost</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {limits.map((limit) => {
                                const edited = editedLimits[limit.id] || limit;
                                const estimatedCost = edited.monthly_token_limit === -1
                                    ? 'Variable'
                                    : `$${((edited.monthly_token_limit / 1000000) * 0.15).toFixed(2)}`;

                                return (
                                    <tr key={limit.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-6 py-5">
                                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${getTierColor(limit.tier_name)}`}>
                                                {limit.tier_name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <input
                                                type="number"
                                                value={edited.monthly_message_limit}
                                                onChange={(e) => handleLimitChange(limit.id, 'monthly_message_limit', e.target.value)}
                                                className="w-24 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-center font-black text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/20"
                                            />
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <input
                                                type="number"
                                                value={edited.monthly_token_limit}
                                                onChange={(e) => handleLimitChange(limit.id, 'monthly_token_limit', e.target.value)}
                                                className="w-24 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-center font-black text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/20"
                                            />
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <input
                                                type="number"
                                                value={edited.monthly_whatsapp_limit}
                                                onChange={(e) => handleLimitChange(limit.id, 'monthly_whatsapp_limit', e.target.value)}
                                                className="w-24 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-center font-black text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/20"
                                            />
                                        </td>
                                        <td className="px-6 py-5 text-sm font-bold text-gray-600 dark:text-gray-400">
                                            {estimatedCost}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Individual User Usage */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <h2 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">Active Usage Tracking</h2>
                    <p className="text-xs font-medium text-gray-500 mt-1">Real-time statistics for the top 50 active AI chatters.</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right" dir="rtl">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/30">
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">User Context</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tier</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">AI Activity</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">WhatsApp</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">AI Usage</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Reset</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {usage.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center font-bold text-gray-400 uppercase tracking-widest">No active AI usage data found.</td>
                                </tr>
                            ) : (
                                usage.map((u) => {
                                    const tierLimit = limits.find(l => l.tier_name === u.subscription_tier);
                                    const messagePercent = tierLimit ? getUsagePercentage(u.message_count, tierLimit.monthly_message_limit) : 0;

                                    return (
                                        <tr key={u.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-6 py-5">
                                                <div className="font-bold text-gray-900 dark:text-white text-sm">{u.user_email || 'Unknown User'}</div>
                                                <div className="text-[10px] text-gray-400 font-mono tracking-tighter">{u.user_id.split('-')[0]}...</div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${getTierColor(u.subscription_tier || 'free')}`}>
                                                    {u.subscription_tier || 'free'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <div className="font-black text-gray-900 dark:text-white text-sm">{u.message_count} msgs</div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{u.tokens_used.toLocaleString()} tokens</div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <div className="font-black text-brand-600 dark:text-brand-400 text-sm">{u.whatsapp_messages || 0}</div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">sent msgs</div>
                                            </td>
                                            <td className="px-6 py-5 w-48">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-500 ${messagePercent > 90 ? 'bg-red-600' : messagePercent > 70 ? 'bg-orange-500' : 'bg-brand-600'}`}
                                                                style={{ width: `${messagePercent}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[10px] font-black text-gray-900 dark:text-white min-w-[3ch]">{messagePercent.toFixed(0)}%</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-left text-xs font-bold text-gray-400 whitespace-nowrap">
                                                {new Date(u.last_reset_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
