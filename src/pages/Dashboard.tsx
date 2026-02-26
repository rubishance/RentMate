import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useTranslation } from '../hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import { useDataCache } from '../contexts/DataCacheContext';
import { DashboardHero } from '../components/dashboard/DashboardHero';
import { QuickActionFAB } from '../components/dashboard/QuickActionFAB';
import { DEFAULT_WIDGET_LAYOUT, WidgetConfig, DashboardData, WIDGET_REGISTRY } from '../components/dashboard/WidgetRegistry';
import { FileSearch, Plus } from 'lucide-react';
import { ReportGenerationModal } from '../components/modals/ReportGenerationModal';
import { cn } from '../lib/utils';
import { useSubscription } from '../hooks/useSubscription';
import { BriefingService, FeedItem } from '../services/briefing.service';
import { BionicWelcomeOverlay } from '../components/onboarding/BionicWelcomeOverlay';
import { BionicSpotlight } from '../components/onboarding/BionicSpotlight';
import { useAuth } from '../contexts/AuthContext';
import { SmartActionsRow } from '../components/dashboard/SmartActionsRow';
import { Button } from '../components/ui/Button';
import { useStack } from '../contexts/StackContext';
import { NotificationGeneratorService } from '../services/NotificationGeneratorService';

export function Dashboard() {
    const { lang, t } = useTranslation();
    const navigate = useNavigate();
    const { preferences } = useUserPreferences();
    const { get, set } = useDataCache();
    const { user, profile: authProfile } = useAuth();
    const { plan } = useSubscription();
    const { push } = useStack();

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ monthlyIncome: 0, collected: 0, pending: 0 });
    const [storageCounts, setStorageCounts] = useState({ media: 0, utilities: 0, maintenance: 0, documents: 0 });
    const [activeContracts, setActiveContracts] = useState<any[]>([]);
    const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
    const [layout, setLayout] = useState<WidgetConfig[]>(DEFAULT_WIDGET_LAYOUT);
    const [counts, setCounts] = useState<{ properties: number; contracts: number; tenants: number } | null>(null);
    const [isRefetching, setIsRefetching] = useState(false);

    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

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

            // Run Notification Checks periodically per session
            const lastCheck = sessionStorage.getItem('last_notification_check');
            const shouldCheck = !lastCheck || (new Date().getTime() - new Date(lastCheck).getTime() > 1000 * 60 * 60 * 2); // Every 2 hours
            if (shouldCheck) {
                // Don't await to not block rendering
                NotificationGeneratorService.runChecks();
            }

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
            setCounts(cached.counts || null);
            setLayout(cached.layout || layout);
            setIsRefetching(true); // Background update starts
            setLoading(false);
        }

        try {
            // v1.4.15 Race Timeout Logic
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Dashboard timeout')), 6000));
            const fetchPromise = Promise.all([
                supabase.rpc('get_dashboard_summary', { p_user_id: user.id }),
                BriefingService.getBriefingItems(user.id, t),
                supabase.from('properties').select('id', { count: 'exact', head: true }),
                supabase.from('contracts').select('id, tenants', { count: 'exact' })
            ]);

            const responses = await Promise.race([fetchPromise, timeoutPromise]) as any;
            const summary = responses[0]?.data;
            const briefing = responses[1];
            const propertiesCount = responses[2]?.count || 0;
            const contractsData = responses[3]?.data || [];
            const contractsCount = responses[3]?.count || 0;
            const totalTenants = contractsData.reduce((acc: number, c: any) => acc + (Array.isArray(c.tenants) ? c.tenants.length : 0), 0);

            setCounts({
                properties: propertiesCount,
                contracts: contractsCount,
                tenants: totalTenants
            });

            // Calculate precise financials client-side to ensure we ignore archived contracts
            const startOfCurrentMonth = new Date();
            startOfCurrentMonth.setDate(1);
            startOfCurrentMonth.setHours(0, 0, 0, 0);

            const endOfCurrentMonth = new Date(startOfCurrentMonth);
            endOfCurrentMonth.setMonth(endOfCurrentMonth.getMonth() + 1);

            const activeContractIds = contractsData.filter((c: any) => c.status === 'active').map((c: any) => c.id);

            let finalStats = { monthlyIncome: 0, collected: 0, pending: 0 };

            if (activeContractIds.length > 0) {
                const { data: paymentsData } = await supabase
                    .from('payments')
                    .select('amount, status, due_date')
                    .eq('user_id', user.id)
                    .in('contract_id', activeContractIds)
                    .gte('due_date', startOfCurrentMonth.toISOString().split('T')[0])
                    .lt('due_date', endOfCurrentMonth.toISOString().split('T')[0]);

                if (paymentsData) {
                    const collected = paymentsData.filter(p => p.status === 'paid').reduce((acc, p) => acc + p.amount, 0);
                    const pending = paymentsData.filter(p => p.status === 'pending' || p.status === 'overdue').reduce((acc, p) => acc + p.amount, 0);

                    finalStats = {
                        monthlyIncome: collected + pending,
                        collected,
                        pending
                    };
                }
            }

            setStats(finalStats);

            if (summary) {
                setStorageCounts(summary.storage_counts || storageCounts);
                setActiveContracts(summary.active_contracts || []);
            }

            set(cacheKey, {
                stats: finalStats,
                storageCounts: summary?.storage_counts || storageCounts,
                activeContracts: summary?.active_contracts || activeContracts,
                feedItems: briefing,
                counts: { properties: propertiesCount, contracts: contractsCount, tenants: totalTenants },
                layout
            }, { persist: true });

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

    const handleBriefingAction = useCallback((item: FeedItem) => {
        if (!item.metadata) return;

        console.log('[Dashboard] Action triggered:', item.metadata.type, item.metadata);

        switch (item.metadata.type) {
            case 'contract_expired':
            case 'maintenance_active':
                navigate('/properties');
                break;
            case 'onboarding_stalled':
                push('contract_wizard', {}, { isExpanded: true, title: t('newContract') });
                break;
            case 'payment_overdue':
                navigate('/payments');
                break;
            default:
                // Default: toggle notifications if we don't know where to go
                window.dispatchEvent(new CustomEvent('TOGGLE_NOTIFICATIONS'));
        }
    }, [navigate, push, t]);

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

            <div className="pb-32 pt-8 px-4 md:px-8 space-y-8 md:space-y-12 relative z-10">

                {/* Header Area: Hero + Actions aligned with other pages */}
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 overflow-hidden">
                            <DashboardHero
                                firstName={firstName}
                                feedItems={feedItemsWithActions}
                                showOnly="welcome"
                            />
                        </div>

                        <Button
                            onClick={() => window.dispatchEvent(new CustomEvent('TOGGLE_QUICK_ACTIONS'))}
                            className="h-14 w-14 rounded-2xl p-0 shrink-0 bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all duration-300"
                            title={t('addNew')}
                        >
                            <Plus className="w-6 h-6" />
                        </Button>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Edit Mode Toggle & Status */}
                        <div className="hidden md:inline-flex items-center gap-2 px-3 py-1 bg-primary/5 rounded-full border border-primary/10">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                {t('online')}
                            </span>
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsReportModalOpen(true)}
                            className="text-[10px] uppercase tracking-widest font-bold bg-white/50 dark:bg-black/20 backdrop-blur-md border border-white/20 hover:bg-white/80 transition-all flex-1 sm:flex-none"
                        >
                            <FileSearch className="w-3.5 h-3.5 mr-2" />
                            {t('generateReport')}
                        </Button>
                    </div>
                </div>

                {/* Alerts / Insights Carousel below header */}
                <div className="mb-6 md:mb-10">
                    <DashboardHero
                        firstName={firstName}
                        feedItems={feedItemsWithActions}
                        showOnly="alerts"
                    />
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

            <ReportGenerationModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
            />
            <QuickActionFAB />
        </div>
    );
}
