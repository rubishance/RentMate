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
import { cn } from '../lib/utils';

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
}

export function Dashboard() {
    const { lang, t } = useTranslation();
    const navigate = useNavigate();
    const { preferences } = useUserPreferences();
    const [loading, setLoading] = useState(true);
    const { get, set } = useDataCache();

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
            console.log('Dashboard init: checking user');
            const { data: { user } } = await supabase.auth.getUser();
            console.log('Dashboard init: user found:', !!user);
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

    async function loadDashboardData() {
        console.log('loadDashboardData: starting');

        // Developer Bypass Logic for Dashboard logic
        const isBypass = import.meta.env.DEV && localStorage.getItem('rentmate_e2e_bypass') === 'true';

        let user;
        try {
            const { data } = await supabase.auth.getUser();
            user = data.user;
        } catch (e) {
            console.error('loadDashboardData: Auth check failed', e);
        }

        console.log('loadDashboardData: user:', !!user, 'bypass:', isBypass);

        if (!user && !isBypass) {
            console.log('loadDashboardData: No user and no bypass, stopping.');
            setLoading(false);
            return;
        }

        const effectiveUserId = user?.id || 'demo-user-id';
        const cacheKey = `dashboard_data_v4_${effectiveUserId}_${preferences.language}`;

        // Try load from cache first for instant UI
        const cached = get<any>(cacheKey);
        if (cached) {
            console.log('loadDashboardData: Using cached data');
            setProfile(cached.profile);
            setStats(cached.stats);
            setStorageCounts(cached.storageCounts);
            setActiveContracts(cached.activeContracts || []);
            setFeedItems(cached.feedItems || []);
            setLoading(false);

            // Check if layout is empty and rescue if needed
            if (!layout || layout.filter(w => w.visible).length === 0) {
                console.warn('loadDashboardData: Layout rescue triggered from cache check');
                setLayout(DEFAULT_WIDGET_LAYOUT);
            }
        }

        try {
            console.log('loadDashboardData: Fetching fresh data for:', effectiveUserId);

            // If bypass and no real user, use mock profile
            let profileData = null;
            if (user) {
                const { data } = await supabase
                    .from('user_profiles')
                    .select('full_name')
                    .eq('id', user.id)
                    .single();
                profileData = data;
            } else if (isBypass) {
                profileData = { full_name: 'Developer (Bypass)' };
            }

            // Parallel fetch remaining data
            const [summaryResponse, feedItemsData, reportSetting] = await Promise.all([
                user ? supabase.rpc('get_dashboard_summary', { p_user_id: user.id }) : Promise.resolve({ data: null }),
                loadFeedItems(effectiveUserId),
                supabase.from('system_settings').select('value').eq('key', 'auto_monthly_reports_enabled').single()
            ]);

            const summary = summaryResponse.data;

            // Update state
            if (profileData) setProfile(profileData);
            if (summary) {
                setStats({
                    monthlyIncome: summary.monthly_income || 0,
                    collected: summary.collected_this_month || 0,
                    pending: summary.pending_payments || 0
                });
                setStorageCounts(summary.storage_counts || {});
                setActiveContracts(summary.active_contracts || []);
            }
            setFeedItems(feedItemsData);
            setReportsEnabled(reportSetting?.data?.value === true);

            // Persist
            set(cacheKey, {
                profile: profileData,
                stats: summary ? {
                    monthlyIncome: summary.monthly_income,
                    collected: summary.collected_this_month,
                    pending: summary.pending_payments
                } : stats,
                storageCounts: summary?.storage_counts || storageCounts,
                activeContracts: summary?.active_contracts || [],
                feedItems: feedItemsData
            }, { persist: true });

            console.log('loadDashboardData: completed successfully');
        } catch (error) {
            console.error('loadDashboardData: error:', error);
        } finally {
            setLoading(false);

            // Final layout rescue check
            if (!layout || layout.filter(w => w.visible).length === 0) {
                console.warn('loadDashboardData: Final layout rescue check triggered');
                setLayout(DEFAULT_WIDGET_LAYOUT);
            }
        }
    }

    async function loadFeedItems(userId: string): Promise<FeedItem[]> {
        const items: FeedItem[] = [];
        const today = format(new Date(), 'yyyy-MM-dd');

        try {
            const { data: expired } = await supabase
                .from('contracts')
                .select('*, properties(city, address)')
                .eq('user_id', userId)
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

        return items;
    }

    const firstName = profile?.full_name?.split(' ')[0] || '';

    const dashboardData = useMemo<DashboardData>(() => ({
        profile,
        stats,
        storageCounts,
        activeContracts,
        feedItems
    }), [profile, stats, storageCounts, activeContracts, feedItems]);

    const handleLayoutChange = (newLayout: WidgetConfig[]) => {
        setLayout(newLayout);
        const persistLayout = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                localStorage.setItem(`dashboard_layout_${user.id}_v1`, JSON.stringify(newLayout));
            }
        };
        persistLayout();
    };

    if (loading) {
        return (
            <div className="px-6 py-20 max-w-5xl mx-auto space-y-12">
                <div className="h-8 w-48 bg-slate-100 animate-pulse rounded-2xl" />
                <div className="h-96 w-full bg-slate-100 animate-pulse rounded-[3rem]" />
            </div>
        );
    }

    return (
        <div className="pb-40 pt-6 space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Hero Section */}
            <DashboardHero firstName={firstName} feedItems={feedItems} />

            <div className="max-w-6xl mx-auto px-4">
                <ConciergeWidget />
            </div>

            {/* Content Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-6">
                        <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground/40">{t('overview')}</h2>
                        <div className="h-px w-12 bg-slate-100" />
                    </div>

                    <div className="flex items-center gap-4">
                        {reportsEnabled && (
                            <button
                                onClick={() => setIsReportModalOpen(true)}
                                className="flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl bg-indigo-500/10 text-indigo-600 border border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-500/20 transition-all shadow-minimal"
                            >
                                <FileSearch className="w-3.5 h-3.5" />
                                {lang === 'he' ? 'הפקת דוח' : 'Generate Report'}
                            </button>
                        )}

                        <button
                            onClick={() => setIsEditingLayout(!isEditingLayout)}
                            className={cn(
                                "flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-500",
                                isEditingLayout
                                    ? "bg-primary text-primary-foreground shadow-premium ring-4 ring-primary/10"
                                    : "bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 text-muted-foreground hover:border-primary/30 hover:text-primary shadow-minimal"
                            )}
                        >
                            {isEditingLayout ? <CheckIcon className="w-3.5 h-3.5" /> : <Edit3Icon className="w-3.5 h-3.5" />}
                            {isEditingLayout ? t('saveLayout') : t('customize')}
                        </button>
                    </div>
                </div>

                {/* Grid */}
                <DashboardGrid
                    layout={layout}
                    data={dashboardData}
                    isEditing={isEditingLayout}
                    onLayoutChange={handleLayoutChange}
                />
            </div>

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

            <ReportGenerationModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
            />
        </div>
    );
}
