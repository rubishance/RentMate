import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useTranslation } from '../hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import { RentyCommandCenter } from '../components/dashboard/RentyCommandCenter';
import { useDataCache } from '../contexts/DataCacheContext';
import { DashboardHero } from '../components/dashboard/DashboardHero';
import { DEFAULT_WIDGET_LAYOUT, WidgetConfig, DashboardData, WIDGET_REGISTRY } from '../components/dashboard/WidgetRegistry';
import { FileSearch } from 'lucide-react';
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
import { Button } from '../components/ui/Button';

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
    const [isRefetching, setIsRefetching] = useState(false);

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
            setCounts(cached.counts || { properties: 0, contracts: 0, tenants: 0 });
            setLayout(cached.layout || layout);
            setLoading(false);
            setIsRefetching(true); // Background update starts
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
            setIsRefetching(false);
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
    }, [feedItems, handleBriefingAction]);

    if (loading && !feedItems.length) {
        return (
            <div className="px-3 py-20 max-w-5xl mx-auto space-y-12">
                <div className="h-8 w-48 bg-slate-100 animate-pulse rounded-2xl" />
                <div className="h-96 w-full bg-slate-100 animate-pulse rounded-[3rem]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-canvas text-foreground pb-32 md:pb-12 relative overflow-x-hidden transition-colors duration-500">
            {/* Mobile: Top Bar Background Extension */}
            <div className="fixed top-0 left-0 right-0 h-32 bg-gradient-to-b from-canvas to-transparent z-0 pointer-events-none md:hidden" />

            {/* Bionic Elements */}
            <BionicWelcomeOverlay firstName={firstName} />

            <div className="container mx-auto px-4 pt-4 md:pt-10 relative z-10 max-w-7xl space-y-8 md:space-y-12">

                {/* Dashboard Hero (Welcome & Alerts) */}
                <div className="mb-6 md:mb-10">
                    <DashboardHero firstName={firstName} feedItems={feedItemsWithActions} />
                </div>

                {/* Gamification: Setup Progress */}
                {!loading && !isRefetching && (counts.properties === 0 || counts.tenants === 0) && (
                    <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <SetupProgressWidget
                            hasProperty={counts.properties > 0}
                            hasTenant={counts.tenants > 0}
                        />
                    </div>
                )}

                {/* Edit Mode Toggle & Status */}
                <div className="flex flex-wrap items-center justify-end gap-3">
                    <div className="hidden md:inline-flex items-center gap-2 px-3 py-1 bg-primary/5 rounded-full border border-primary/10 mr-auto">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {lang === 'he' ? 'מחובר' : 'online'}
                        </span>
                    </div>


                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsReportModalOpen(true)}
                        className="text-[10px] uppercase tracking-widest font-bold bg-white/50 dark:bg-black/20 backdrop-blur-md border border-white/20 hover:bg-white/80 transition-all"
                    >
                        <FileSearch className="w-3.5 h-3.5 mr-2" />
                        {t('generateReport')}
                    </Button>
                </div>

                {/* Bento Stack / Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-8 auto-rows-min">
                    {layout
                        .filter(w => w.visible)
                        .sort((a, b) => a.order - b.order)
                        .map((widget) => {
                            const WidgetComponent = WIDGET_REGISTRY[widget.widgetId];
                            if (!WidgetComponent) return null;

                            // Mobile: Full Width (Stack). Desktop: Based on config size.
                            const colSpan = {
                                'small': 'md:col-span-3',
                                'medium': 'md:col-span-6',
                                'large': 'md:col-span-12', // Financial Health, Storage usually full width
                            }[widget.size];

                            return (
                                <div
                                    key={widget.id}
                                    className={cn(colSpan, "relative group animate-in fade-in zoom-in-95 duration-500")}
                                    data-widget-id={widget.widgetId}
                                >

                                    {/* Render Widget */}
                                    {WidgetComponent(
                                        dashboardData,
                                        widget,
                                        (updates) => updateWidget(widget.id, updates)
                                    )}
                                </div>
                            );
                        })}
                </div>
            </div>

            {/* Renty Command Center - Bottom Fixed (Mobile) / Floating (Desktop) */}
            <div id="renty-command-center" className="fixed bottom-0 left-0 right-0 z-50 p-2 pb-4 md:p-4 pointer-events-none flex justify-center transition-transform duration-500 ease-out translate-y-0">
                <div className="w-full max-w-xl pointer-events-auto shadow-xl shadow-primary/10 rounded-[1.5rem] overflow-hidden transform transition-all hover:scale-[1.01]">
                    <RentyCommandCenter
                        firstName={firstName}
                        feedItems={feedItemsWithActions}
                        className="glass-premium border-t border-white/40 md:border md:rounded-[2rem] bg-white/80 dark:bg-black/80 backdrop-blur-2xl"
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
