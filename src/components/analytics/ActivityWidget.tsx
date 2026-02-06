import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../hooks/useTranslation';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line
} from 'recharts';
import { Eye, Users, TrendingUp, Clock } from 'lucide-react';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';

export function ActivityWidget() {
    const { t } = useTranslation();
    const [dailyActiveUsers, setDailyActiveUsers] = useState<any[]>([]);
    const [pageViews, setPageViews] = useState<any[]>([]);
    const [topPages, setTopPages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchActivityData();
    }, []);

    const fetchActivityData = async () => {
        setLoading(true);
        try {
            const endDate = new Date();
            const startDate = subDays(endDate, 14); // Last 14 days

            const { data: activity } = await supabase
                .from('user_activity')
                .select('user_id, event_type, path, created_at')
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: true });

            if (!activity) return;

            // Process DAU
            const dauMap = new Map<string, Set<string>>();
            const viewsMap = new Map<string, number>();
            const pagesMap = new Map<string, number>();

            // Initialize all days
            const days = eachDayOfInterval({ start: startDate, end: endDate });
            days.forEach(day => {
                const dateKey = format(day, 'MMM dd');
                dauMap.set(dateKey, new Set());
                viewsMap.set(dateKey, 0);
            });

            activity.forEach(log => {
                const dateKey = format(new Date(log.created_at), 'MMM dd');

                if (dauMap.has(dateKey)) {
                    dauMap.get(dateKey)?.add(log.user_id);
                }

                if (log.event_type === 'page_view') {
                    viewsMap.set(dateKey, (viewsMap.get(dateKey) || 0) + 1);
                    pagesMap.set(log.path, (pagesMap.get(log.path) || 0) + 1);
                }
            });

            const dauData = Array.from(dauMap.entries()).map(([date, users]) => ({
                date,
                users: users.size
            }));

            const viewsData = Array.from(viewsMap.entries()).map(([date, count]) => ({
                date,
                views: count
            }));

            const topPagesData = Array.from(pagesMap.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([path, count]) => ({ path, count }));

            setDailyActiveUsers(dauData);
            setPageViews(viewsData);
            setTopPages(topPagesData);

        } catch (error) {
            console.error('Error fetching activity:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="h-64 animate-pulse bg-white/5 rounded-3xl" />;

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                    <Users className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-foreground tracking-tight lowercase">
                        {/* {t('userActivity') || 'User Activity'} */}
                        user activity
                    </h2>
                    <p className="text-sm text-muted-foreground font-medium lowercase">
                        active users & page views (last 14 days)
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* DAU Chart */}
                <div className="glass-premium dark:bg-neutral-900/40 border-white/5 rounded-[2.5rem] p-8 shadow-minimal">
                    <h3 className="text-lg font-black text-foreground mb-6 flex items-center gap-2 lowercase">
                        <Users className="w-4 h-4 text-emerald-500" />
                        daily active users
                    </h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailyActiveUsers}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-white/5" opacity={0.3} />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 700 }}
                                    axisLine={false}
                                    tickLine={false}
                                    className="text-muted-foreground opacity-60"
                                    dy={10}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}
                                    itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 700 }}
                                />
                                <Bar dataKey="users" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Page Views Chart */}
                <div className="glass-premium dark:bg-neutral-900/40 border-white/5 rounded-[2.5rem] p-8 shadow-minimal">
                    <h3 className="text-lg font-black text-foreground mb-6 flex items-center gap-2 lowercase">
                        <Eye className="w-4 h-4 text-blue-500" />
                        page views trend
                    </h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={pageViews}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-white/5" opacity={0.3} />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 700 }}
                                    axisLine={false}
                                    tickLine={false}
                                    className="text-muted-foreground opacity-60"
                                    dy={10}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}
                                    itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 700 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="views"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    dot={{ fill: '#3b82f6', r: 4, strokeWidth: 0 }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Top Pages List */}
            <div className="glass-premium dark:bg-neutral-900/40 border-white/5 rounded-[2.5rem] p-8 shadow-minimal">
                <h3 className="text-lg font-black text-foreground mb-6 flex items-center gap-2 lowercase">
                    <TrendingUp className="w-4 h-4 text-amber-500" />
                    most visited pages
                </h3>
                <div className="space-y-4">
                    {topPages.map((page, index) => (
                        <div key={index} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-3">
                                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 text-[10px] font-black text-muted-foreground">
                                    {index + 1}
                                </span>
                                <span className="text-sm font-bold text-foreground font-mono">{page.path}</span>
                            </div>
                            <span className="text-xs font-black text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full">
                                {page.count} views
                            </span>
                        </div>
                    ))}
                    {topPages.length === 0 && (
                        <div className="text-center py-10 text-muted-foreground text-sm lowercase">
                            no data available yet
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
