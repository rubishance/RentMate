import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useTranslation } from '../hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import { DashboardHero } from '../components/dashboard/DashboardHero';
import { useDataCache } from '../contexts/DataCacheContext';
import { RentyRagdoll } from '../components/chat/RentyRagdoll';
import { formatDate } from '../lib/utils';
import { DashboardGrid } from '../components/dashboard/DashboardGrid';
import { DEFAULT_WIDGET_LAYOUT, WidgetConfig, DashboardData } from '../components/dashboard/WidgetRegistry';
import { Edit3Icon, CheckIcon } from 'lucide-react';

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

    // Widget Layout State
    const [layout, setLayout] = useState<WidgetConfig[]>(DEFAULT_WIDGET_LAYOUT);
    const [isEditingLayout, setIsEditingLayout] = useState(false);

    useEffect(() => {
        loadDashboardData();
        // Load layout from preferences if saved (TODO: Implement persistence)
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

    const dashboardData: DashboardData = {
        profile,
        stats,
        storageCounts: storageCounts,
        activeContracts,
        feedItems
    };

    return (
        <div className="pb-40 pt-6 space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Hero Section */}
            <DashboardHero firstName={firstName} feedItems={feedItems} />

            {/* Dashboard Controls */}
            <div className="flex justify-end px-4">
                <button
                    onClick={() => setIsEditingLayout(!isEditingLayout)}
                    className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-full bg-slate-100 dark:bg-neutral-900 hover:bg-slate-200 transition-colors"
                >
                    {isEditingLayout ? <CheckIcon className="w-3 h-3" /> : <Edit3Icon className="w-3 h-3" />}
                    {isEditingLayout ? 'Done' : 'Customize'}
                </button>
            </div>

            {/* Widget Grid */}
            <DashboardGrid
                layout={layout}
                data={dashboardData}
                isEditing={isEditingLayout}
                onLayoutChange={setLayout}
            />

            {/* Bottom System Status Section */}
            <section className="pt-12 border-t border-slate-100 dark:border-neutral-900 flex flex-col items-center text-center space-y-10">
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

        </div>
    );
}
