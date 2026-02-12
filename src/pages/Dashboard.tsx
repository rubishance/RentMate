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
import { SmartActionsRow } from '../components/dashboard/SmartActionsRow';
import { SetupProgressWidget } from '../components/dashboard/SetupProgressWidget';

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
    const [counts, setCounts] = useState({ properties: 0, contracts: 0, tenants: 0 });

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
                userScoringService.shouldShowUpsell(user.id, plan?.name || ''),
                supabase.from('properties').select('id', { count: 'exact', head: true }),
                supabase.from('contracts').select('id, tenants', { count: 'exact' })
            ]);

            const responses = await Promise.race([fetchPromise, timeoutPromise]) as any;
            const summary = responses[0]?.data;
            const briefing = responses[1];
            const shouldShowBanner = responses[2];
            const propertiesCount = responses[3]?.count || 0;
            const contractsData = responses[4]?.data || [];
            const contractsCount = responses[4]?.count || 0;
            const totalTenants = contractsData.reduce((acc: number, c: any) => acc + (Array.isArray(c.tenants) ? c.tenants.length : 0), 0);

            setCounts({
                properties: propertiesCount,
                contracts: contractsCount,
                tenants: totalTenants
            });

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
                    counts: { properties: propertiesCount, contracts: contractsCount, tenants: totalTenants },
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

                {/* Gamification: Setup Progress (Shows only if onboarding not complete) */}
                {(counts.properties === 0 || counts.tenants === 0) && (
                    <div className="mb-8">
                        <SetupProgressWidget
                            hasProperty={counts.properties > 0}
                            hasTenant={counts.tenants > 0}
                        />
                    </div>
                )}

                {/* Command Bar */}
                {/* Smart Actions & Tools */}
                <div className="flex flex-col gap-6">
                    <SmartActionsRow />

                    <div className="flex items-center justify-end gap-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 backdrop-blur-md rounded-full border border-white/10 mr-auto">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/40">
                                {lang === 'he' ? 'מחובר' : 'online'}
                            </span>
                        </div>

                        <button
                            onClick={() => setIsEditingLayout(!isEditingLayout)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                                isEditingLayout
                                    ? "bg-indigo-600 text-white shadow-premium scale-105"
                                    : "bg-white/50 dark:bg-black/20 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-white/5 hover:bg-white dark:hover:bg-white/10"
                            )}
                        >
                            {isEditingLayout ? <CheckIcon className="w-3.5 h-3.5" /> : <Edit3Icon className="w-3.5 h-3.5" />}
                            {isEditingLayout ? t('saveLayout') : t('editLayout')}
                        </button>

                        <button
                            onClick={() => setIsReportModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-black/20 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white dark:hover:bg-white/10 transition-all duration-300"
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
