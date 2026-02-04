import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useTranslation } from '../hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import { RentyCommandCenter } from '../components/dashboard/RentyCommandCenter';
import { useDataCache } from '../contexts/DataCacheContext';
import { DashboardGrid } from '../components/dashboard/DashboardGrid';
import { DEFAULT_WIDGET_LAYOUT, WidgetConfig, DashboardData, WIDGET_REGISTRY } from '../components/dashboard/WidgetRegistry';
import { Edit3Icon, CheckIcon, FileSearch, ArrowRight, Crown, Sparkles } from 'lucide-react';
import { ReportGenerationModal } from '../components/modals/ReportGenerationModal';
import { cn } from '../lib/utils';
import { userScoringService } from '../services/user-scoring.service';
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
    const [showProBanner, setShowProBanner] = useState(false);
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

            const [summaryResponse, feedItemsData, reportSetting, shouldShowBanner] = await Promise.all([
                user ? supabase.rpc('get_dashboard_summary', { p_user_id: user.id }) : Promise.resolve({ data: null }),
                BriefingService.getBriefingItems(effectiveUserId, t),
                supabase.from('system_settings').select('value').eq('key', 'auto_monthly_reports_enabled').single(),
                user ? userScoringService.shouldShowUpsell(user.id, plan?.name || '') : Promise.resolve(false)
            ]);

            const summary = summaryResponse.data;

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
            setShowProBanner(shouldShowBanner);

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

            <div className="max-w-6xl mx-auto px-4">
                {showProBanner && (
                    /* V3: Reduced padding (p-6 -> p-4), tighter corner radius, jewel shadow */
                    <div className="mt-6 relative overflow-hidden rounded-[1.5rem] bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 p-[1px] shadow-2xl shadow-indigo-500/20 animate-in zoom-in-95 duration-500">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Crown className="w-24 h-24 rotate-12" />
                        </div>
                        <div className="relative bg-neutral-950/20 backdrop-blur-sm rounded-[1.5rem] p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-white/20 rounded-xl shadow-inner hidden md:block">
                                    <Sparkles className="w-6 h-6 text-yellow-300" />
                                </div>
                                <div className="space-y-0.5 text-center md:text-start">
                                    <h3 className="text-lg font-bold text-white tracking-tight">
                                        {lang === 'he' ? 'זיהינו שאתם מנהלים מקצוענים!' : 'Pro Manager Detected!'}
                                    </h3>
                                    <p className="text-indigo-100 max-w-xl text-xs leading-relaxed opacity-90">
                                        {lang === 'he'
                                            ? 'רוצים לנהל תיק נכסים שלם עם אוטומציות מתקדמות? שדרגו ל-MATE.'
                                            : 'Scale your portfolio with MATE automation.'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/pricing')}
                                className="whitespace-nowrap px-5 py-2.5 bg-white text-indigo-600 font-bold text-sm rounded-xl shadow-lg hover:bg-indigo-50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 group"
                            >
                                {lang === 'he' ? 'שדרגו ל-MATE' : 'Upgrade to MATE'}
                                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                )}
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
        </div>
    );
}
