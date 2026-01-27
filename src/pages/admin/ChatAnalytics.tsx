import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
    BarChart3,
    TrendingUp,
    MessageSquare,
    Clock,
    Zap,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

interface ChatAnalytics {
    total_conversations: number;
    total_messages: number;
    avg_messages_per_conversation: number;
    avg_response_time_seconds: number;
    common_questions: Array<{ question: string; count: number }>;
    hourly_distribution: Array<{ hour: number; count: number }>;
    daily_trend: Array<{ date: string; count: number }>;
    category_breakdown: Array<{ category: string; count: number }>;
    user_satisfaction: number;
    escalation_rate: number;
}

interface Interaction {
    user_id: string;
    title: string | null;
    created_at: string;
}

interface TicketData {
    category: string;
    created_at: string;
}

export default function ChatAnalytics() {
    const [analytics, setAnalytics] = useState<ChatAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
    const [error, setError] = useState<string | null>(null);

    const fetchAnalytics = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Calculate date range
            const endDate = new Date();
            const startDate = new Date();
            const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
            startDate.setDate(startDate.getDate() - days);

            // Fetch CRM interactions (chat type)
            const { data: interactions, error: interactionsError } = await supabase
                .from('crm_interactions')
                .select('*')
                .eq('type', 'chat')
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString())
                .order('created_at', { ascending: true });

            if (interactionsError) throw interactionsError;

            // Fetch support tickets created from chat
            const { data: tickets, error: ticketsError } = await supabase
                .from('support_tickets')
                .select('category, created_at')
                .not('chat_context', 'is', null)
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString());

            if (ticketsError) throw ticketsError;

            // Process analytics
            const processedAnalytics = processAnalyticsData((interactions as unknown as Interaction[]) || [], (tickets as unknown as TicketData[]) || []);
            setAnalytics(processedAnalytics);
        } catch (err: unknown) {
            console.error('Error fetching analytics:', err);
            setError(err instanceof Error ? err.message : 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    }, [timeRange]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    const processAnalyticsData = (interactions: Interaction[], tickets: TicketData[]): ChatAnalytics => {
        // Total conversations (unique user sessions)
        const uniqueUsers = new Set(interactions.map(i => i.user_id));
        const total_conversations = uniqueUsers.size;

        // Total messages (count interactions)
        const total_messages = interactions.length;

        // Average messages per conversation
        const avg_messages_per_conversation = total_conversations > 0
            ? Math.round(total_messages / total_conversations)
            : 0;

        // Common questions (extract from titles)
        const questionCounts: Record<string, number> = {};
        interactions.forEach(i => {
            const question = i.title?.replace('Chat: ', '').substring(0, 50) || 'Unknown';
            questionCounts[question] = (questionCounts[question] || 0) + 1;
        });
        const common_questions = Object.entries(questionCounts)
            .map(([question, count]) => ({ question, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Hourly distribution
        const hourCounts: Record<number, number> = {};
        interactions.forEach(i => {
            const hour = new Date(i.created_at).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });
        const hourly_distribution = Array.from({ length: 24 }, (_, hour) => ({
            hour,
            count: hourCounts[hour] || 0
        }));

        // Daily trend
        const dateCounts: Record<string, number> = {};
        interactions.forEach(i => {
            const date = new Date(i.created_at).toISOString().split('T')[0];
            dateCounts[date] = (dateCounts[date] || 0) + 1;
        });
        const daily_trend = Object.entries(dateCounts)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Category breakdown from tickets
        const categoryCounts: Record<string, number> = {};
        tickets.forEach(t => {
            categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
        });
        const category_breakdown = Object.entries(categoryCounts)
            .map(([category, count]) => ({ category, count }));

        // Escalation rate (tickets created / total conversations)
        const escalation_rate = total_conversations > 0
            ? Math.round((tickets.length / total_conversations) * 100)
            : 0;

        return {
            total_conversations,
            total_messages,
            avg_messages_per_conversation,
            avg_response_time_seconds: 2.5, // Mock - would need to track actual response times
            common_questions,
            hourly_distribution,
            daily_trend,
            category_breakdown,
            user_satisfaction: 85, // Mock - would need user ratings
            escalation_rate
        };
    };

    const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
                    <p className="text-red-600 font-bold">{error}</p>
                </div>
            </div>
        );
    }

    if (!analytics) return null;

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <BarChart3 className="w-8 h-8 text-brand-600" />
                        Chat Analytics
                    </h1>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                        Insights into chatbot performance, common questions, and user behavior.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                        {(['7d', '30d', '90d'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${timeRange === range
                                    ? 'bg-white dark:bg-gray-800 text-brand-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={fetchAnalytics}
                        className="p-2.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
                    >
                        <ArrowPathIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                            <MessageSquare className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Conversations</p>
                            <p className="text-3xl font-black text-gray-900 dark:text-white">{analytics.total_conversations}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800">
                            <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Avg Messages/Chat</p>
                            <p className="text-3xl font-black text-gray-900 dark:text-white">{analytics.avg_messages_per_conversation}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800">
                            <Clock className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Avg Response Time</p>
                            <p className="text-3xl font-black text-gray-900 dark:text-white">{analytics.avg_response_time_seconds}s</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800">
                            <Zap className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Escalation Rate</p>
                            <p className="text-3xl font-black text-gray-900 dark:text-white">{analytics.escalation_rate}%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Daily Trend */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight mb-6">Daily Conversation Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={analytics.daily_trend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                            <YAxis stroke="#9ca3af" fontSize={12} />
                            <Tooltip />
                            <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Hourly Distribution */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight mb-6">Hourly Activity Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analytics.hourly_distribution}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="hour" stroke="#9ca3af" fontSize={12} />
                            <YAxis stroke="#9ca3af" fontSize={12} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Category Breakdown */}
                {analytics.category_breakdown.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight mb-6">Escalation Categories</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={analytics.category_breakdown}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ index, percent }: { index: number; percent?: number }) => {
                                        const data = analytics.category_breakdown[index];
                                        return `${data.category}: ${((percent || 0) * 100).toFixed(0)}%`;
                                    }}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="count"
                                >
                                    {analytics.category_breakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Common Questions */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight mb-6">Top 10 Questions</h3>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                        {analytics.common_questions.map((q, i) => (
                            <div key={i} className="flex items-center justify-between gap-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                                <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">{q.question}</span>
                                <span className="px-2 py-1 bg-brand-100 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 rounded-lg text-xs font-bold shrink-0">
                                    {q.count}x
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
