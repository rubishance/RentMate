import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useTranslation } from '../hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import { RentyCommandCenter } from '../components/dashboard/RentyCommandCenter';
import { useDataCache } from '../contexts/DataCacheContext';
import { DashboardHero } from '../components/dashboard/DashboardHero';
import { DEFAULT_WIDGET_LAYOUT, WidgetConfig, DashboardData, WIDGET_REGISTRY } from '../components/dashboard/WidgetRegistry';
import { Edit3Icon, CheckIcon, FileSearch, ArrowRight, Crown, Sparkles } from 'lucide-react';
import { ReportGenerationModal } from '../components/modals/ReportGenerationModal';
import { cn } from '../lib/utils';
import { userScoringService } from '../services/user-scoring.service';
import { useSubscription } from '../hooks/useSubscription';
import { BriefingService, FeedItem } from '../services/briefing.service';
import { BionicWelcomeOverlay } from '../components/onboarding/BionicWelcomeOverlay';
import { BionicSpotlight } from '../components/onboarding/BionicSpotlight';
import { useAuth } from '../contexts/AuthContext';

export function Dashboard() {
    const { lang, t } = useTranslation();
    const navigate = useNavigate();
    const { preferences } = useUserPreferences();
    const { get, set } = useDataCache();
    const { user, profile: authProfile } = useAuth();
    const { plan } = useSubscription();

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ monthlyIncome: 0, collected: 0, pending: 0 });
    const [storageCounts, setStorageCounts] = useState({ media: 0, utilities: 0, maintenance: 0, documents: 0 });
    const [activeContracts, setActiveContracts] = useState<any[]>([]);
    const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
    const [layout, setLayout] = useState<WidgetConfig[]>(DEFAULT_WIDGET_LAYOUT);

    const [isEditingLayout, setIsEditingLayout] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [showProBanner, setShowProBanner] = useState(false);

    const [mountId] = useState(() => Math.random().toString(36).substring(7));

    // Initial Load & Layout Restoration
    useEffect(() => {
        console.log(`[Dashboard] [${mountId}] Final Stabilization Mount`);
        if (user) {
            const layoutKey = `dashboard_layout_${user.id}_v2`;
            const saved = localStorage.getItem(layoutKey);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    const validLayout = parsed.filter((w: any) => Object.keys(WIDGET_REGISTRY).includes(w.widgetId));
                    if (validLayout.length > 0) setLayout(validLayout);
                } catch (e) { console.warn('Layout parse error', e); }
            }
            loadData();
        } else {
            setLoading(false);
        }
    }, [user, mountId]);

    async function loadData() {
        if (!user) return;
        const cacheKey = `dashboard_main_v1_${user.id}_${lang}`;
        const cached = get<any>(cacheKey);

        if (cached) {
            setStats(cached.stats);
            setStorageCounts(cached.storageCounts);
            setActiveContracts(cached.activeContracts);
            setFeedItems(cached.feedItems);
            setLayout(cached.layout || layout);
            setLoading(false);
        }

        try {
            // v1.4.15 Race Timeout Logic
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Dashboard timeout')), 6000));
            const fetchPromise = Promise.all([
                supabase.rpc('get_dashboard_summary', { p_user_id: user.id }),
                BriefingService.getBriefingItems(user.id, t),
                userScoringService.shouldShowUpsell(user.id, plan?.name || '')
            ]);

            const responses = await Promise.race([fetchPromise, timeoutPromise]) as any;
            const summary = responses[0]?.data;
            const briefing = responses[1];
            const shouldShowBanner = responses[2];

            if (summary) {
                const newStats = {
                    monthlyIncome: summary.monthly_income || 0,
                    collected: summary.collected_this_month || 0,
                    pending: summary.pending_payments || 0
                };
                setStats(newStats);
                setStorageCounts(summary.storage_counts || storageCounts);
                setActiveContracts(summary.active_contracts || []);
                setShowProBanner(shouldShowBanner);

                set(cacheKey, {
                    stats: newStats,
                    storageCounts: summary.storage_counts || storageCounts,
                    activeContracts: summary.active_contracts || [],
                    feedItems: briefing,
                    layout
                }, { persist: true });
            }
            setFeedItems(briefing);
        } catch (e) {
            console.error('[Dashboard] Restore failed:', e);
        } finally {
            setLoading(false);
        }
    }

    const dashboardData = useMemo<DashboardData>(() => ({
        profile: authProfile,
        stats,
        storageCounts,
        activeContracts,
        feedItems
    }), [authProfile, stats, storageCounts, activeContracts, feedItems]);

    const handleLayoutChange = (newLayout: WidgetConfig[]) => {
        setLayout(newLayout);
        if (user) {
            localStorage.setItem(`dashboard_layout_${user.id}_v2`, JSON.stringify(newLayout));
        }
    };

    const updateWidget = (id: string, updates: Partial<WidgetConfig>) => {
        const newLayout = layout.map(w => w.id === id ? { ...w, ...updates } : w);
        handleLayoutChange(newLayout);
    };

    const firstName = authProfile?.full_name?.split(' ')[0] || '';

    const handleBriefingAction = (item: FeedItem) => {
        if (!item.metadata) return;

        console.log('[Dashboard] Action triggered:', item.metadata.type, item.metadata);

        switch (item.metadata.type) {
            case 'contract_expired':
            case 'maintenance_active':
            case 'onboarding_stalled':
                navigate('/properties');
                break;
            case 'payment_overdue':
                navigate('/payments');
                break;
            default:
                // Default: toggle notifications if we don't know where to go
                window.dispatchEvent(new CustomEvent('TOGGLE_NOTIFICATIONS'));
        }
    };

    const feedItemsWithActions = useMemo(() => {
        return feedItems.map(item => ({
            ...item,
            onAction: () => handleBriefingAction(item)
        }));
    }, [feedItems, navigate]);

    if (loading && !feedItems.length) {
        return (
            <div className="px-3 py-20 max-w-5xl mx-auto space-y-12">
                <div className="h-8 w-48 bg-slate-100 animate-pulse rounded-2xl" />
                <div className="h-96 w-full bg-slate-100 animate-pulse rounded-[3rem]" />
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 dark:bg-neutral-950 transition-colors duration-300 pb-40">
            <BionicWelcomeOverlay firstName={firstName} />

            <div className="max-w-7xl mx-auto px-4 md:px-10 pt-8 md:pt-12 space-y-8 md:space-y-12">
                <DashboardHero firstName={firstName} feedItems={feedItemsWithActions} />

                {/* Command Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex flex-col gap-1 md:gap-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 backdrop-blur-md rounded-full border border-white/10 w-fit mb-2">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
                                {lang === 'he' ? 'חיבור חי' : 'live connection'}
                            </span>
                        </div>
                        <h1 className="text-2xl md:text-5xl font-black tracking-tighter text-white leading-[0.9] lowercase">
                            {lang === 'he' ? 'ערב טוב,' : 'good evening,'}
                            <br />
                            <span className="text-white/40">{user?.user_metadata?.first_name || user?.email?.split('@')[0]}</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsEditingLayout(!isEditingLayout)}
                            className={cn(
                                "flex items-center gap-2.5 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300",
                                isEditingLayout
                                    ? "bg-indigo-600 text-white shadow-premium scale-105"
                                    : "bg-white dark:bg-neutral-900 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-neutral-800 shadow-minimal hover:shadow-premium"
                            )}
                        >
                            {isEditingLayout ? <CheckIcon className="w-3.5 h-3.5" /> : <Edit3Icon className="w-3.5 h-3.5" />}
                            {isEditingLayout ? t('saveLayout') : t('editLayout')}
                        </button>

                        <button
                            onClick={() => setIsReportModalOpen(true)}
                            className="flex items-center gap-2.5 px-6 py-3 bg-white dark:bg-neutral-900 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-neutral-800 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-minimal hover:shadow-premium transition-all duration-300"
                        >
                            <FileSearch className="w-3.5 h-3.5" />
                            {t('generateReport')}
                        </button>
                    </div>
                </div>

                <div id="renty-command-center">
                    <RentyCommandCenter firstName={firstName} feedItems={feedItemsWithActions} />
                </div>

                {/* Stabilized Grid (Manual Mapping) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
                    {layout
                        .filter(w => w.visible)
                        .sort((a, b) => a.order - b.order)
                        .map((widget) => {
                            const WidgetComponent = WIDGET_REGISTRY[widget.widgetId];
                            const sizeClass = widget.size === 'large' ? 'col-span-1 lg:col-span-2' : 'col-span-1';
                            if (!WidgetComponent) return null;
                            return (
                                <div key={widget.id} className={cn("relative transition-all duration-300", sizeClass)}>
                                    {WidgetComponent(dashboardData, widget as any, (updates) => updateWidget(widget.id, updates))}
                                </div>
                            );
                        })
                    }
                </div>
            </div>

            <ReportGenerationModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
            />

            <BionicSpotlight
                targetId="renty-command-center"
                featureId="command_center_intro_v1"
                title={lang === 'he' ? 'מרכז הבקרה של רנטי' : 'Renty Command Center'}
                description={lang === 'he'
                    ? 'דבר עם רנטי, העלה קבצים ונהל את הכל במקום אחד.'
                    : 'Talk to Renty, upload files, and manage everything in one place.'}
                position="bottom"
            />
        </main>
    );
}
