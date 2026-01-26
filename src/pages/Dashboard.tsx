import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useTranslation } from '../hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import { TrendingUpIcon as TrendingUp, PlusIcon as Plus, ActivityIcon as Activity, ArrowRightIcon as ArrowRight } from '../components/icons/NavIcons';
import { NotificationWarningIcon, NotificationInfoIcon } from '../components/icons/NotificationIcons';
import { AddPropertyModal } from '../components/modals/AddPropertyModal';
import { formatDate, cn } from '../lib/utils';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

// Widgets
import { TimelineWidget } from '../components/dashboard/TimelineWidget';
import { StorageStatsWidget } from '../components/dashboard/StorageStatsWidget';
import { KnowledgeBaseWidget } from '../components/dashboard/KnowledgeBaseWidget';
import { DashboardHero } from '../components/dashboard/DashboardHero';
import { RentyRagdoll } from '../components/chat/RentyRagdoll';
import { useDataCache } from '../contexts/DataCacheContext';

interface FeedItem {
    id: string;
    type: 'warning' | 'info' | 'success' | 'urgent' | 'action';
    title: string;
    desc: string;
    date: string;
    actionLabel?: string;
    onAction?: () => void;
}

interface UserProfile {
    full_name: string;
    first_name: string;
}

export function Dashboard() {
    const { lang, t } = useTranslation();
    const navigate = useNavigate();
    const { preferences } = useUserPreferences();
    const [loading, setLoading] = useState(true);
    const { get, set } = useDataCache();
    const CACHE_KEY = `dashboard_data_v3_${preferences.language}`;

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [stats, setStats] = useState({
        monthlyIncome: 0,
        collected: 0,
        pending: 0
    });

    const [storageCounts, setStorageCounts] = useState({ media: 0, utilities: 0, maintenance: 0, documents: 0 });
    const [activeContracts, setActiveContracts] = useState<any[]>([]);
    const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
    const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);

    useEffect(() => {
        loadDashboardData();
    }, []);

    async function loadDashboardData() {
        const cached = get<any>(CACHE_KEY);
        if (cached) {
            setProfile(cached.profile);
            setStats(cached.stats);
            setStorageCounts(cached.storageCounts);
            setActiveContracts(cached.activeContracts);
            setFeedItems(cached.feedItems);
            setLoading(false);
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profileData } = await supabase
                .from('user_profiles')
                .select('full_name, first_name')
                .eq('id', user.id)
                .single();

            if (profileData) setProfile(profileData);

            // Fetch summary
            const { data: summary } = await supabase.rpc('get_dashboard_summary', {
                p_user_id: user.id
            });

            let currentStats = stats;
            let currentCounts = storageCounts;

            if (summary) {
                currentStats = {
                    monthlyIncome: summary.income.monthlyTotal,
                    collected: summary.income.collected,
                    pending: summary.income.pending
                };
                currentCounts = summary.storage;
                setStats(currentStats);
                setStorageCounts(currentCounts);
            }

            // Contracts
            const { data: contracts } = await supabase
                .from('contracts')
                .select('*, properties(city, address)')
                .eq('status', 'active')
                .order('end_date', { ascending: true })
                .limit(5);

            if (contracts) setActiveContracts(contracts);

            // Feed
            const currentFeed = await loadFeedItems(user.id);

            set(CACHE_KEY, {
                profile: profileData,
                stats: currentStats,
                storageCounts: currentCounts,
                activeContracts: contracts || [],
                feedItems: currentFeed
            });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function loadFeedItems(userId: string): Promise<FeedItem[]> {
        const items: FeedItem[] = [];
        const today = new Date().toISOString().split('T')[0];

        try {
            const { data: expired } = await supabase
                .from('contracts')
                .select('*, properties(city, address)')
                .eq('status', 'active')
                .lt('end_date', today);

            expired?.forEach((c: any) => {
                items.push({
                    id: `expired-${c.id}`,
                    type: 'warning',
                    title: t('contractEnded'),
                    desc: `${c.properties?.[0]?.address || c.properties?.address}`,
                    date: formatDate(c.end_date),
                    actionLabel: t('calculate'),
                    onAction: () => navigate('/calculator', { state: { contractData: c } })
                });
            });

            const { data: overdue } = await supabase
                .from('payments')
                .select('*, contracts(properties(address))')
                .eq('user_id', userId)
                .eq('status', 'pending')
                .lt('due_date', today)
                .limit(3);

            overdue?.forEach((p: any) => {
                items.push({
                    id: `overdue-${p.id}`,
                    type: 'urgent',
                    title: t('paymentOverdue'),
                    desc: `₪${p.amount.toLocaleString()}`,
                    date: formatDate(p.due_date),
                    onAction: () => navigate('/payments')
                });
            });
        } catch (err) {
            console.error(err);
        }

        if (items.length === 0) {
            items.push({ id: 'welcome', type: 'success', title: t('welcomeMessage'), desc: t('allLooksQuiet'), date: t('now') });
        }

        setFeedItems(items);
        return items;
    }

    if (loading) {
        return (
            <div className="px-6 py-20 max-w-5xl mx-auto space-y-12">
                <div className="h-8 w-48 bg-slate-100 animate-pulse rounded-2xl" />
                <div className="h-96 w-full bg-slate-100 animate-pulse rounded-[3rem]" />
            </div>
        );
    }

    const firstName = profile?.first_name || profile?.full_name?.split(' ')[0] || '';

    return (
        <div className="pb-40 pt-16 space-y-24 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Hero Section */}
            <DashboardHero firstName={firstName} feedItems={feedItems} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                {/* Main Content Column */}
                <div className="lg:col-span-8 space-y-20">
                    <section className="space-y-8">
                        <div className="flex items-center justify-between px-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">
                                {t('leaseTimeline')}
                            </h3>
                            <button
                                onClick={() => navigate('/contracts')}
                                className="text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:text-foreground transition-colors px-4 py-2 bg-slate-50 dark:bg-neutral-900 rounded-full border border-slate-100 dark:border-neutral-800 shadow-minimal"
                            >
                                {t('viewAll')}
                            </button>
                        </div>
                        <div className="bg-white dark:bg-neutral-900 rounded-[3rem] p-4 shadow-minimal border border-slate-100 dark:border-neutral-800">
                            <TimelineWidget contracts={activeContracts} />
                        </div>
                    </section>

                    {feedItems.length > 1 && (
                        <section className="space-y-8">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground px-4">
                                {t('upcomingAlerts')}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {feedItems.slice(1, 3).map(item => (
                                    <div
                                        key={item.id}
                                        className="p-8 bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 rounded-[2.5rem] shadow-minimal flex items-center gap-6 group cursor-pointer hover:shadow-premium transition-all duration-500"
                                        onClick={item.onAction}
                                    >
                                        <div className={cn(
                                            "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 duration-500 shadow-minimal",
                                            item.type === 'warning' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20' : 'bg-slate-50 text-slate-600 dark:bg-neutral-800'
                                        )}>
                                            {item.type === 'warning' ? <NotificationWarningIcon className="w-6 h-6" /> : <NotificationInfoIcon className="w-6 h-6" />}
                                        </div>
                                        <div className="min-w-0 space-y-1">
                                            <h4 className="font-black text-base tracking-tight text-foreground lowercase truncate">{item.title}</h4>
                                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-40">{item.date}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* Sidebar Column */}
                <div className="lg:col-span-4 space-y-12">
                    {/* Financial Summary Card */}
                    <div className="p-10 bg-foreground text-background rounded-[3rem] shadow-premium-dark relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-150 transition-transform duration-1000" />
                        <div className="space-y-10 relative z-10">
                            <div className="flex justify-between items-center opacity-40">
                                <span className="text-[10px] font-black uppercase tracking-widest">{t('monthlyIncome')}</span>
                                <TrendingUp className="w-4 h-4" />
                            </div>
                            <div className="text-6xl font-black tracking-tighter">
                                ₪{stats.monthlyIncome.toLocaleString()}
                            </div>
                            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/10">
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black opacity-40 block uppercase tracking-widest">{t('pending')}</span>
                                    <span className="text-base font-black text-orange-400 tracking-tighter">₪{stats.pending.toLocaleString()}</span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black opacity-40 block uppercase tracking-widest">{t('collected')}</span>
                                    <span className="text-base font-black text-emerald-400 tracking-tighter">₪{stats.collected.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Access Grid */}
                    <div className="grid grid-cols-2 gap-6">
                        <button
                            onClick={() => navigate('/contracts/new')}
                            className="flex flex-col items-center justify-center p-10 bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 rounded-[2.5rem] shadow-minimal hover:shadow-premium transition-all group"
                        >
                            <div className="w-14 h-14 bg-slate-50 dark:bg-neutral-800 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-minimal">
                                <Plus className="w-7 h-7 text-foreground" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-foreground">{t('addAsset')}</span>
                        </button>
                        <button
                            onClick={() => navigate('/calculator')}
                            className="flex flex-col items-center justify-center p-10 bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 rounded-[2.5rem] shadow-minimal hover:shadow-premium transition-all group"
                        >
                            <div className="w-14 h-14 bg-slate-50 dark:bg-neutral-800 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500 shadow-minimal">
                                <Activity className="w-7 h-7 text-foreground" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-foreground">{t('calculator')}</span>
                        </button>
                    </div>

                    <div className="space-y-12">
                        <StorageStatsWidget counts={storageCounts} />
                        <KnowledgeBaseWidget />
                    </div>
                </div>
            </div>

            {/* Bottom System Status Section */}
            <section className="pt-24 border-t border-slate-100 dark:border-neutral-900 flex flex-col items-center text-center space-y-10">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-neutral-900 rounded-full border border-slate-100 dark:border-neutral-800">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">{t('systemStatus')}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground font-black uppercase tracking-widest opacity-40 italic">"Renty is keeping an eye on your universe."</p>
                </div>
                <div className="scale-110">
                    <RentyRagdoll />
                </div>
            </section>

            <AddPropertyModal
                isOpen={isPropertyModalOpen}
                onClose={() => setIsPropertyModalOpen(false)}
                onSuccess={() => { loadDashboardData(); setIsPropertyModalOpen(false); }}
            />
        </div>
    );
}
