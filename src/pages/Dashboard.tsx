import { useState, useEffect, useMemo } from 'react';
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
import { Edit3Icon, CheckIcon, FileSearch } from 'lucide-react';
import { ConciergeWidget } from '../components/dashboard/ConciergeWidget';
import { format } from 'date-fns';
import { ReportGenerationModal } from '../components/modals/ReportGenerationModal';

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
    const { get, set, clear } = useDataCache();
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

    const [layout, setLayout] = useState<WidgetConfig[]>(DEFAULT_WIDGET_LAYOUT);

    const [isEditingLayout, setIsEditingLayout] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportsEnabled, setReportsEnabled] = useState(false);

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const layoutKey = `dashboard_layout_${user.id}_v1`;
                const saved = localStorage.getItem(layoutKey);
                if (saved) {
                    try {
                        setLayout(JSON.parse(saved));
                    } catch (e) {
                        setLayout(DEFAULT_WIDGET_LAYOUT);
                    }
                }
            }
            loadDashboardData();
        }
        init();
    }, []);

    const handleLayoutChange = async (newLayout: WidgetConfig[]) => {
        setLayout(newLayout);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            localStorage.setItem(`dashboard_layout_${user.id}_v1`, JSON.stringify(newLayout));
        }
    };

    async function loadDashboardData() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const USER_CACHE_KEY = `dashboard_data_v4_${user.id}_${preferences.language}`;
        const cached = get<any>(USER_CACHE_KEY);
        if (cached) {
            setProfile(cached.profile);
            setStats(cached.stats);
            setStorageCounts(cached.storageCounts);
            setActiveContracts(cached.activeContracts);
            setFeedItems(cached.feedItems);
            setLoading(false);
        }
        try {
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
                .select('*, properties(id, city, address)')
                .eq('user_id', user.id) // STRICTLY enforce ownership
                .eq('status', 'active')
                .order('end_date', { ascending: true })
                .limit(5);

            if (contracts) setActiveContracts(contracts);

            // Feed
            const currentFeed = await loadFeedItems(user.id);

            // Fetch settings
            const { data: reportSetting } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'auto_monthly_reports_enabled')
                .single();

            setReportsEnabled(reportSetting?.value === true);

            set(USER_CACHE_KEY, {
                profile: profileData,
                stats: currentStats,
                storageCounts: currentCounts,
                activeContracts: contracts || [],
                feedItems: currentFeed
            }, { persist: true });
            setLoading(false);
        } catch (error) {
            console.error('Error fetching dashboard info:', error);
            setLoading(false);
        }
    }

    async function loadFeedItems(userId: string): Promise<FeedItem[]> {
        const items: FeedItem[] = [];
        const today = format(new Date(), 'yyyy-MM-dd');

        try {
            const { data: expired } = await supabase
                .from('contracts')
                .select('*, properties(city, address)')
                .eq('user_id', userId) // STRICTLY enforce ownership
                .eq('status', 'active')
                .lt('end_date', today);

            expired?.forEach((c: any) => {
                const endDate = c.end_date ? new Date(c.end_date) : null;
                const property = Array.isArray(c.properties) ? c.properties[0] : c.properties;
                const address = property?.address || property?.[0]?.address || t('unknownProperty');

                items.push({
                    id: `expired-${c.id}`,
                    type: 'warning',
                    title: t('contractEnded'),
                    desc: address,
                    date: endDate && !isNaN(endDate.getTime()) ? formatDate(endDate) : t('unknown'),
                    actionLabel: t('calculate'),
                    onAction: () => navigate('/calculator', { state: { contractData: c } })
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

    const dashboardData = useMemo<DashboardData>(() => ({
        profile,
        stats,
        storageCounts,
        activeContracts,
        feedItems
    }), [profile, stats, storageCounts, activeContracts, feedItems]);


    return (
        <div className="pb-40 pt-6 space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Hero Section */}
            <DashboardHero firstName={firstName} feedItems={feedItems} />

            <div className="max-w-6xl mx-auto px-4">
                <ConciergeWidget />
            </div>

            {/* Dashboard Controls */}
            <div className="flex justify-end px-4 gap-4">
                {reportsEnabled && (
                    <button
                        onClick={() => setIsReportModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-500/20 transition-colors shadow-minimal"
                    >
                        <FileSearch className="w-3.5 h-3.5" />
                        {lang === 'he' ? 'הפקת דוח' : 'Generate Report'}
                    </button>
                )}

                <button
                    onClick={() => setIsEditingLayout(!isEditingLayout)}
                    className="flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-full bg-slate-100 dark:bg-neutral-900 hover:bg-slate-200 transition-colors"
                >
                    {isEditingLayout ? <CheckIcon className="w-3.5 h-3.5" /> : <Edit3Icon className="w-3.5 h-3.5" />}
                    {isEditingLayout ? 'Done' : 'Customize'}
                </button>
            </div>

            <ReportGenerationModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
            />

            {/* Widget Grid */}
            <DashboardGrid
                layout={layout}
                data={dashboardData}
                isEditing={isEditingLayout}
                onLayoutChange={handleLayoutChange}
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
