import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useTranslation } from '../hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import { RentyCommandCenter } from '../components/dashboard/RentyCommandCenter';
import { useDataCache } from '../contexts/DataCacheContext';
import { DashboardGrid } from '../components/dashboard/DashboardGrid';
import { DEFAULT_WIDGET_LAYOUT, WidgetConfig, DashboardData, WIDGET_REGISTRY } from '../components/dashboard/WidgetRegistry';
import { Edit3Icon, CheckIcon, FileSearch, ArrowRight } from 'lucide-react';
import { ReportGenerationModal } from '../components/modals/ReportGenerationModal';
import { QuickActionFAB } from '../components/dashboard/QuickActionFAB';
import { cn } from '../lib/utils';
import { useSubscription } from '../hooks/useSubscription';
import { BriefingService, FeedItem } from '../services/briefing.service';

interface UserProfile {
    full_name: string;
}

export function DashboardStitchV3() {
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
    const { plan } = useSubscription();

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const layoutKey = `dashboard_layout_${user.id}_v1`;
                const saved = localStorage.getItem(layoutKey);
                if (saved) {
                    try {
                        const parsed = JSON.parse(saved);
                        const validLayout = parsed.filter((w: any) => Object.keys(WIDGET_REGISTRY).includes(w.widgetId));
                        setLayout(validLayout.length > 0 ? validLayout : DEFAULT_WIDGET_LAYOUT);
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
        const isBypass = import.meta.env.DEV && localStorage.getItem('rentmate_e2e_bypass') === 'true';
        let user;
        try {
            const { data } = await supabase.auth.getUser();
            user = data.user;
        } catch (e) {
            console.error('loadDashboardData: Auth check failed', e);
        }

        if (!user && !isBypass) {
            setLoading(false);
            return;
        }

        const effectiveUserId = user?.id || 'demo-user-id';
        const cacheKey = `dashboard_data_v4_${effectiveUserId}_${preferences.language}`;
        const cached = get<any>(cacheKey);

        if (cached) {
            setProfile(cached.profile);
            setStats(cached.stats);
            setStorageCounts(cached.storageCounts);
            setActiveContracts(cached.activeContracts || []);
            setFeedItems(cached.feedItems || []);
            setLoading(false);
            if (!layout || layout.filter(w => w.visible).length === 0) {
                setLayout(DEFAULT_WIDGET_LAYOUT);
            }
        }

        try {
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

            const [summaryResponse, feedItemsData, reportSetting] = await Promise.all([
                user ? supabase.rpc('get_dashboard_summary', { p_user_id: user.id }) : Promise.resolve({ data: null }),
                BriefingService.getBriefingItems(effectiveUserId, t),
                supabase.from('system_settings').select('value').eq('key', 'auto_monthly_reports_enabled').single()
            ]);

            const summary = summaryResponse.data;

            if (profileData) setProfile(profileData);
            if (summary) {
                setStats({
                    monthlyIncome: summary.income?.monthlyTotal || 0,
                    collected: summary.income?.collected || 0,
                    pending: summary.income?.pending || 0
                });
                setStorageCounts(summary.storage_counts || {});
                setActiveContracts(summary.active_contracts || []);
            }
            setFeedItems(feedItemsData);
            setReportsEnabled(reportSetting?.data?.value === true);

            set(cacheKey, {
                profile: profileData,
                stats: summary ? {
                    monthlyIncome: summary.income?.monthlyTotal,
                    collected: summary.income?.collected,
                    pending: summary.income?.pending
                } : stats,
                storageCounts: summary?.storage_counts || storageCounts,
                activeContracts: summary?.active_contracts || [],
                feedItems: feedItemsData
            }, { persist: true });

        } catch (error) {
            console.error('loadDashboardData: error:', error);
        } finally {
            setLoading(false);
            if (!layout || layout.filter(w => w.visible).length === 0) {
                setLayout(DEFAULT_WIDGET_LAYOUT);
            }
        }
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
            <div className="px-3 py-20 max-w-5xl mx-auto space-y-12">
                <div className="h-8 w-48 bg-slate-100 animate-pulse rounded-2xl" />
                <div className="h-96 w-full bg-slate-100 animate-pulse rounded-[3rem]" />
            </div>
        );
    }

    // Stitch Design V3: Final Polish, Bionic Density, Micro-interactions
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 pb-40 space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Hero Section - V3: Sticky, Blurred 2xl, integrated seamlessly */}
            <div className="sticky top-0 z-20 backdrop-blur-2xl bg-white/50 dark:bg-neutral-950/50 border-b border-white/20 dark:border-neutral-800/50 pt-2 pb-2 transition-all duration-300">
                <RentyCommandCenter firstName={firstName} feedItems={feedItems} />
            </div>


            {/* Content Section - Main Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* V3 Toolbar: Tighter, cleaner */}
                <div className="flex items-center justify-end mb-4 gap-3">
                    {reportsEnabled && (
                        <button
                            onClick={() => setIsReportModalOpen(true)}
                            className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:border-indigo-500/30 text-muted-foreground hover:text-indigo-600 transition-all shadow-sm hover:shadow-md"
                        >
                            <FileSearch className="w-3 h-3" />
                            {lang === 'he' ? 'הפקת דוח' : 'Report'}
                        </button>
                    )}

                    <button
                        onClick={() => setIsEditingLayout(!isEditingLayout)}
                        className={cn(
                            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                            isEditingLayout
                                ? "bg-primary text-primary-foreground shadow-lg scale-105"
                                : "bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-muted-foreground hover:border-primary/30 hover:text-primary shadow-sm hover:shadow-md"
                        )}
                    >
                        {isEditingLayout ? <CheckIcon className="w-3 h-3" /> : <Edit3Icon className="w-3 h-3" />}
                        {isEditingLayout ? t('saveLayout') : t('customize')}
                    </button>
                </div>

                {/* Grid - V3: Bionic Density implied via CSS var injection or just structure */}
                <div className="relative">
                    {/* Simulated Style Injection for Grid Density */}
                    <DashboardGrid
                        layout={layout}
                        data={dashboardData}
                        isEditing={isEditingLayout}
                        onLayoutChange={handleLayoutChange}
                        onUpdateWidgetSettings={(id, settings) => {
                            const newLayout = layout.map(w => w.id === id ? { ...w, settings } : w);
                            handleLayoutChange(newLayout);
                        }}
                    />
                </div>
            </div>

            <ReportGenerationModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
            />
            <QuickActionFAB />
        </div>
    );
}
