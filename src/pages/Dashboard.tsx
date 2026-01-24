import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import logoIconOnly from '../assets/rentmate-icon-only.png';
import logoIconDark from '../assets/rentmate-icon-only-dark.png';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useTranslation } from '../hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import { ActionMenu } from '../components/ui/ActionMenu';
import { NotificationWarningIcon, NotificationInfoIcon, NotificationSuccessIcon, NotificationErrorIcon } from '../components/icons/NotificationIcons';
import { TrendingUpIcon as TrendingUp, ClockIcon as Clock, AlertCircleIcon as AlertTriangle, PlusIcon as Plus, ActivityIcon as Activity, BellIcon as Bell, BellOffIcon as BellOff, TrashIcon as Trash2, HomeIcon as Home } from '../components/icons/NavIcons';
import { AddPropertyModal } from '../components/modals/AddPropertyModal';
import { AddTenantModal } from '../components/modals/AddTenantModal';
import { AddPaymentModal } from '../components/modals/AddPaymentModal';
import { formatDate, cn } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

// Widgets
import { TimelineWidget } from '../components/dashboard/TimelineWidget';
import { SmartActionsWidget } from '../components/dashboard/SmartActionsWidget';
import { StorageStatsWidget } from '../components/dashboard/StorageStatsWidget';
import { KnowledgeBaseWidget } from '../components/dashboard/KnowledgeBaseWidget';
import { propertyDocumentsService } from '../services/property-documents.service';
import { useDataCache } from '../contexts/DataCacheContext';

// --- Types ---
interface FeedItem {
    id: string;
    type: 'warning' | 'info' | 'success' | 'urgent' | 'action';
    title: string;
    desc: string;
    date: string;
    actionLabel?: string;
    onAction?: () => void;
    snoozedUntil?: string;
}

interface UserProfile {
    full_name: string;
    first_name: string;
}



export function Dashboard() {

    const { lang, t } = useTranslation();
    const navigate = useNavigate();
    const { preferences, effectiveTheme } = useUserPreferences();
    const [loading, setLoading] = useState(true);
    const { get, set } = useDataCache();
    const CACHE_KEY = `dashboard_data_${preferences.language}`;
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [stats, setStats] = useState({
        monthlyIncome: 0,
        collected: 0,
        pending: 0
    });

    // New States
    const [storageCounts, setStorageCounts] = useState({ media: 0, utilities: 0, maintenance: 0, documents: 0 });
    const [activeContracts, setActiveContracts] = useState<any[]>([]);

    const [feedItems, setFeedItems] = useState<FeedItem[]>([]);

    // Modals
    const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
    const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const snoozeMessage = (messageId: string, days: number) => {
        const snoozeUntil = new Date();
        snoozeUntil.setDate(snoozeUntil.getDate() + days);

        // Store in localStorage
        const snoozedMessages = JSON.parse(localStorage.getItem('snoozedMessages') || '{}');
        snoozedMessages[messageId] = snoozeUntil.toISOString();
        localStorage.setItem('snoozedMessages', JSON.stringify(snoozedMessages));

        // Reload to hide snoozed message
        loadDashboardData();
    };

    const deleteMessage = (messageId: string) => {
        // Store in localStorage as permanently dismissed
        const dismissedMessages = JSON.parse(localStorage.getItem('dismissedMessages') || '[]');
        dismissedMessages.push(messageId);
        localStorage.setItem('dismissedMessages', JSON.stringify(dismissedMessages));

        // Reload to hide deleted message
        loadDashboardData();
    };

    async function loadDashboardData() {
        const cached = get<any>(CACHE_KEY);
        if (cached) {
            setProfile(cached.profile);
            setStats(cached.stats);
            setStorageCounts(cached.storageCounts);
            setActiveContracts(cached.activeContracts);
            setFeedItems(cached.feedItems);
            setLoading(false); // Set loading to false immediately if cached data is shown
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Profile
            const { data: profileData } = await supabase
                .from('user_profiles')
                .select('full_name, first_name')
                .eq('id', user.id)
                .single();

            let currentProfile = profileData; // Store for caching
            if (profileData) setProfile(profileData);

            // 2. Fetch Summary via RPC (Performance Refactor)
            let currentStats = stats; // Initialize with current state for caching
            let currentCounts = storageCounts; // Initialize with current state for caching

            try {
                const { data: summary, error: rpcError } = await supabase.rpc('get_dashboard_summary', {
                    p_user_id: user.id
                });

                if (rpcError) throw rpcError;

                if (summary) {
                    currentStats = { // Update for caching
                        monthlyIncome: summary.income.monthlyTotal,
                        collected: summary.income.collected,
                        pending: summary.income.pending
                    };
                    currentCounts = summary.storage; // Update for caching
                    setStats(currentStats);
                    setStorageCounts(currentCounts);
                }
            } catch (err) {
                console.warn('Dashboard summary RPC failed, using individual fallbacks', err);

                // Fallback 1: Income Stats
                const { data: payments } = await supabase
                    .from('payments')
                    .select('amount, status')
                    .gte('due_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);

                let collected = 0;
                let pending = 0;
                payments?.forEach(p => {
                    if (p.status === 'paid') collected += p.amount;
                    else pending += p.amount;
                });

                currentStats = { // Update for caching
                    monthlyIncome: collected + pending,
                    collected,
                    pending
                };
                setStats(currentStats);

                // Fallback 2: Storage Counts
                try {
                    currentCounts = await propertyDocumentsService.getCategoryCounts(); // Update for caching
                    setStorageCounts(currentCounts);
                } catch (storeErr) {
                    console.error('Total storage count failure', storeErr);
                }
            }

            // 3. Active Contracts for Timeline
            const { data: contracts } = await supabase
                .from('contracts')
                .select('*, properties(city, address)')
                .eq('status', 'active')
                .order('end_date', { ascending: true })
                .limit(5);

            let currentContracts = contracts || []; // Store for caching
            if (contracts) setActiveContracts(contracts);

            // 4. Feed Items
            const currentFeed = await loadFeedItems(); // loadFeedItems now returns the items
            setFeedItems(currentFeed); // Update state with fresh feed items

            // 5. Update Cache
            set(CACHE_KEY, {
                profile: currentProfile,
                stats: currentStats,
                storageCounts: currentCounts,
                activeContracts: currentContracts,
                feedItems: currentFeed
            });

        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadFeedItems(): Promise<FeedItem[]> {
        const items: FeedItem[] = [];
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            // 1. Expired Contracts (Active but past end date)
            const { data: expiredContracts } = await supabase
                .from('contracts')
                .select('*, properties(city, address)')
                .eq('status', 'active')
                .lt('end_date', todayStr);

            if (expiredContracts && expiredContracts.length > 0) {
                expiredContracts.forEach((c: any) => {
                    const propData = Array.isArray(c.properties) ? c.properties[0] : c.properties;
                    const address = propData?.address || t('unknownProperty');

                    items.push({
                        id: `expired-${c.id}`,
                        type: 'warning',
                        title: t('contractEnded'),
                        desc: t('contractEndedDesc', { address, date: formatDate(c.end_date) }),
                        date: formatDate(c.end_date),
                        actionLabel: t('archiveAndCalculate'),
                        onAction: async () => {
                            await supabase
                                .from('contracts')
                                .update({ status: 'archived' })
                                .eq('id', c.id);

                            navigate('/calculator', {
                                state: {
                                    contractData: {
                                        baseRent: c.base_rent,
                                        linkageType: c.linkage_type,
                                        baseIndexDate: c.base_index_date,
                                        startDate: c.start_date,
                                        endDate: c.end_date
                                    }
                                }
                            });
                            loadDashboardData();
                        }
                    });
                });
            }

            // 2. Contracts Expiring Soon (within 30 days)
            const thirtyDaysFromNow = new Date(today);
            thirtyDaysFromNow.setDate(today.getDate() + 30);
            const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];

            const { data: expiringSoon } = await supabase
                .from('contracts')
                .select('*, properties(city, address)')
                .eq('status', 'active')
                .gte('end_date', todayStr)
                .lte('end_date', thirtyDaysStr);

            if (expiringSoon && expiringSoon.length > 0) {
                expiringSoon.forEach((c: any) => {
                    const propData = Array.isArray(c.properties) ? c.properties[0] : c.properties;
                    const address = propData?.address || t('unknownProperty');
                    const endDate = new Date(c.end_date);
                    const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                    items.push({
                        id: `expiring-${c.id}`,
                        type: 'urgent',
                        title: t('contractExpiringSoon'),
                        desc: `${address} - ${daysLeft} ${t('daysLeft')}`,
                        date: formatDate(endDate),
                        actionLabel: t('viewContract'),
                        onAction: () => navigate('/contracts')
                    });
                });
            }

            // 3. Option Deadlines (90 days before contract end)
            const ninetyDaysFromNow = new Date(today);
            ninetyDaysFromNow.setDate(today.getDate() + 90);
            const ninetyDaysStr = ninetyDaysFromNow.toISOString().split('T')[0];

            const { data: optionContracts } = await supabase
                .from('contracts')
                .select('*, properties(city, address)')
                .eq('status', 'active')
                .gte('end_date', ninetyDaysStr)
                .lte('end_date', new Date(today.getFullYear(), today.getMonth() + 4, today.getDate()).toISOString().split('T')[0]);

            if (optionContracts && optionContracts.length > 0) {
                optionContracts.forEach((c: any) => {
                    const propData = Array.isArray(c.properties) ? c.properties[0] : c.properties;
                    const address = propData?.address || t('unknownProperty');
                    const endDate = new Date(c.end_date);
                    const optionDeadline = new Date(endDate);
                    optionDeadline.setDate(endDate.getDate() - 90);

                    if (today >= optionDeadline) {
                        items.push({
                            id: `option-${c.id}`,
                            type: 'action',
                            title: t('optionDeadline'),
                            desc: `${address} - ${t('optionDeadlineWarning', { date: formatDate(optionDeadline) })}`,
                            date: formatDate(optionDeadline),
                            actionLabel: t('review'),
                            onAction: () => navigate('/contracts')
                        });
                    }
                });
            }

            // 4. Overdue Payments
            const { data: overduePayments } = await supabase
                .from('payments')
                .select('*, contracts(id, properties(city, address))')
                .eq('user_id', user.id)
                .eq('status', 'pending')
                .lt('due_date', todayStr)
                .order('due_date', { ascending: true })
                .limit(5);

            if (overduePayments && overduePayments.length > 0) {
                overduePayments.forEach((p: any) => {
                    const contract = p.contracts;
                    const propData = contract?.properties;
                    const address = propData ? `${propData.address}, ${propData.city}` : t('unknownProperty');

                    items.push({
                        id: `overdue-${p.id}`,
                        type: 'warning',
                        title: t('paymentOverdue'),
                        desc: `${address} - ₪${p.amount.toLocaleString()}`,
                        date: formatDate(p.due_date),
                        actionLabel: t('sendReminder'),
                        onAction: () => navigate('/payments')
                    });
                });
            }

            // 5. Upcoming Payments (within 7 days)
            const sevenDaysFromNow = new Date(today);
            sevenDaysFromNow.setDate(today.getDate() + 7);
            const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0];

            const { data: upcomingPayments } = await supabase
                .from('payments')
                .select('*, contracts(id, properties(city, address))')
                .eq('user_id', user.id)
                .eq('status', 'pending')
                .gte('due_date', todayStr)
                .lte('due_date', sevenDaysStr)
                .order('due_date', { ascending: true })
                .limit(3);

            if (upcomingPayments && upcomingPayments.length > 0) {
                upcomingPayments.forEach((p: any) => {
                    const contract = p.contracts;
                    const propData = contract?.properties;
                    const address = propData ? `${propData.address}, ${propData.city}` : t('unknownProperty');
                    const dueDate = new Date(p.due_date);
                    const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                    items.push({
                        id: `upcoming-${p.id}`,
                        type: 'info',
                        title: t('paymentDueSoon'),
                        desc: `${address} - ${daysUntil} ${t('daysLeft')}`,
                        date: formatDate(dueDate),
                        actionLabel: t('viewPayments'),
                        onAction: () => navigate('/payments')
                    });
                });
            }

        } catch (err) {
            console.error('Error fetching feed items:', err);
            return [];
        }

        // Sort by priority: warning > urgent > action > info
        const priorityOrder = { warning: 0, urgent: 1, action: 2, info: 3, success: 4 };
        items.sort((a, b) => priorityOrder[a.type] - priorityOrder[b.type]);

        // If no alerts, show welcome message
        if (items.length === 0) {
            items.push({
                id: 'welcome',
                type: 'success',
                title: t('welcomeMessage'),
                desc: t('allLooksQuiet'),
                date: t('now')
            });
        }

        // Filter out snoozed and dismissed messages
        const snoozedMessages = JSON.parse(localStorage.getItem('snoozedMessages') || '{}');
        const dismissedMessages = JSON.parse(localStorage.getItem('dismissedMessages') || '[]');
        const now = new Date();

        const filteredItems = items.filter(item => {
            if (dismissedMessages.includes(item.id)) return false;
            if (snoozedMessages[item.id]) {
                const snoozeUntil = new Date(snoozedMessages[item.id]);
                if (now < snoozeUntil) return false;
            }
            return true;
        });

        setFeedItems(filteredItems);
        return filteredItems;
    }



    if (loading) {
        return (
            <div className="bg-background min-h-screen px-4 max-w-7xl mx-auto space-y-6 pt-6">
                <div className="flex flex-col space-y-2">
                    <div className="h-4 w-24 bg-muted animate-pulse rounded-full" />
                    <div className="h-10 w-48 bg-muted animate-pulse rounded-xl" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="h-64 bg-muted animate-pulse rounded-3xl" />
                    <div className="h-64 bg-muted animate-pulse rounded-3xl" />
                    <div className="hidden lg:block h-64 bg-muted animate-pulse rounded-3xl" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 h-80 bg-muted animate-pulse rounded-3xl" />
                    <div className="h-80 bg-muted animate-pulse rounded-3xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-background min-h-screen">
            <div className="px-4 max-w-7xl mx-auto space-y-8 pt-6">
                {/* Simplified Welcome Section */}
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">
                        {t('welcomeBack')}
                    </span>
                    <h1 className="text-4xl font-black tracking-tighter mt-1">
                        {profile?.first_name || profile?.full_name?.split(' ')[0] || t('user_generic')}
                    </h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Financial Pulse */}
                    <Card className="p-8 flex flex-col justify-between h-full bg-white dark:bg-neutral-900 shadow-sm border-border rounded-3xl">
                        <div>
                            <div className="flex justify-between items-start mb-6">
                                <span className="text-muted-foreground font-bold text-xs uppercase tracking-widest leading-none">
                                    {t('monthlyIncome')}
                                </span>
                                <div className="p-3 bg-secondary rounded-2xl">
                                    <TrendingUp className="w-5 h-5 text-foreground" />
                                </div>
                            </div>
                            <div className="text-5xl font-black tracking-tighter text-foreground">
                                ₪{stats.monthlyIncome.toLocaleString()}
                            </div>
                        </div>

                        {/* Mini Stats Row */}
                        <div className="grid grid-cols-2 gap-4 pt-8 border-t border-border mt-8">
                            <div>
                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-2">{t('collected')}</span>
                                <span className="text-xl font-black text-foreground flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"></span>
                                    ₪{stats.collected.toLocaleString()}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-2">{t('pending')}</span>
                                <span className="text-xl font-black text-foreground flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]"></span>
                                    ₪{stats.pending.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </Card>

                    {/* Smart Actions */}
                    <div className="h-full">
                        <SmartActionsWidget
                            stats={{ pendingMoney: stats.pending, openMaintenance: 0 }} // Maintenance mocked for now or could fetch
                        />
                    </div>

                    {/* Knowledge Base Teaser (Hidden on small/medium, shown on large) */}
                    <div className="hidden lg:block h-full">
                        <KnowledgeBaseWidget />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                        <TimelineWidget contracts={activeContracts} />
                    </div>
                    <div>
                        <StorageStatsWidget counts={storageCounts} />
                    </div>
                </div>

                {feedItems.length > 0 && (
                    <div className="space-y-4 pb-12">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2">{t('alerts')}</h3>
                        {feedItems.map(item => (
                            <Card key={item.id} className="p-6 flex items-center gap-4 relative group hover:border-foreground transition-all rounded-[2rem] shadow-sm">
                                <div className={cn(
                                    "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110 duration-500",
                                    item.type === 'warning' ? 'bg-orange-50 dark:bg-orange-950 text-orange-600' :
                                        item.type === 'urgent' ? 'bg-red-50 dark:bg-red-950 text-red-600' :
                                            item.type === 'success' ? 'bg-green-50 dark:bg-green-950 text-green-600' :
                                                'bg-secondary text-foreground'
                                )}>
                                    {item.type === 'warning' ? <NotificationWarningIcon className="w-7 h-7" /> :
                                        item.type === 'urgent' ? <NotificationErrorIcon className="w-7 h-7" /> :
                                            item.type === 'success' ? <NotificationSuccessIcon className="w-7 h-7" /> :
                                                <NotificationInfoIcon className="w-7 h-7" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-foreground text-base tracking-tight">{item.title}</h4>
                                    <p className="text-sm text-muted-foreground truncate">{item.desc}</p>
                                    {item.actionLabel && item.onAction && (
                                        <Button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                item.onAction?.();
                                            }}
                                            size="sm"
                                            className="mt-3"
                                        >
                                            {item.actionLabel}
                                        </Button>
                                    )}
                                </div>
                                <div className="text-right shrink-0 self-start">
                                    <span className={cn(
                                        "text-xs font-bold",
                                        item.title.includes('+') ? 'text-green-600' : 'text-muted-foreground'
                                    )}>
                                        {item.date}
                                    </span>
                                </div>

                                {/* 3-dot menu */}
                                <div className="absolute top-2 left-2" onClick={(e) => e.stopPropagation()}>
                                    <ActionMenu
                                        align="left"
                                        onSnooze={(days) => snoozeMessage(item.id, days)}
                                        onDelete={() => deleteMessage(item.id)}
                                    />
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}

            <AddPropertyModal
                isOpen={isPropertyModalOpen}
                onClose={() => setIsPropertyModalOpen(false)}
                onSuccess={() => { loadDashboardData(); setIsPropertyModalOpen(false); }}
            />
            <AddTenantModal
                isOpen={isTenantModalOpen}
                onClose={() => setIsTenantModalOpen(false)}
                onSuccess={() => { setIsTenantModalOpen(false); }}
            />
            <AddPaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onSuccess={() => { loadDashboardData(); setIsPaymentModalOpen(false); }}
            />
        </div >
    );
}
