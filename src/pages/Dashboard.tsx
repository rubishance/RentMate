import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import logoFinalCleanV2 from '../assets/logo-final-clean-v2.png';
import { useTranslation } from '../hooks/useTranslation';
import { ActionMenu } from '../components/ui/ActionMenu';
import { useNavigate } from 'react-router-dom';
import {
    Activity, // Restored
    AlertTriangle, // Restored
    Clock, // Restored
    TrendingUp, // Restored
    Settings,
    Home
} from 'lucide-react';
// import { NotificationCenter } from '../components/NotificationCenter';
import { AddPropertyModal } from '../components/modals/AddPropertyModal';
import { AddTenantModal } from '../components/modals/AddTenantModal';
import { AddPaymentModal } from '../components/modals/AddPaymentModal';

// --- Types ---
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
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [stats, setStats] = useState({
        monthlyIncome: 0,
        collected: 0,
        pending: 0
    });

    const [feedItems, setFeedItems] = useState<FeedItem[]>([]);

    // Modals
    const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
    const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    useEffect(() => {
        loadDashboardData();
    }, []);

    async function loadDashboardData() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Profile
            const { data: profileData } = await supabase
                .from('user_profiles')
                .select('full_name, first_name')
                .eq('id', user.id)
                .single();

            if (profileData) setProfile(profileData);

            // 2. Financial Stats (Mock logic for demo, ideally composed from payments)
            // Fetch verified payments for "Collected"
            // Fetch pending payments for "Pending"
            const { data: payments } = await supabase
                .from('payments')
                .select('amount, status')
                .gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()); // This month

            let collected = 0;
            let pending = 0;
            payments?.forEach(p => {
                if (p.status === 'paid') collected += p.amount;
                else pending += p.amount;
            });

            setStats({
                monthlyIncome: collected + pending,
                collected,
                pending
            });



            // 4. Feed Items (Logic Preserved from previous Dashboard)
            await loadFeedItems();

        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadFeedItems() {
        const items: FeedItem[] = [];

        try {
            // Check for expired active contracts
            const today = new Date().toISOString().split('T')[0];
            const { data: expiredContracts } = await supabase
                .from('contracts')
                .select('*, properties(city, address)')
                .eq('status', 'active')
                .lt('end_date', today);

            if (expiredContracts && expiredContracts.length > 0) {
                expiredContracts.forEach((c: any) => {
                    // Safe access to properties (could be array or object depending on Supabase version/client)
                    const propData = Array.isArray(c.properties) ? c.properties[0] : c.properties;
                    const address = propData?.address || 'Unknown Address';

                    items.push({
                        id: `expired-${c.id}`,
                        type: 'warning',
                        title: t('contractEnded'),
                        desc: t('contractEndedDesc', { address, date: new Date(c.end_date).toLocaleDateString() }),
                        date: new Date(c.end_date).toLocaleDateString(),
                        actionLabel: t('archiveAndCalculate'),
                        onAction: async () => {
                            // 1. Archive
                            await supabase
                                .from('contracts')
                                .update({ status: 'archived' })
                                .eq('id', c.id);

                            // 2. Navigate to calculator
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
                            // Refresh
                            loadDashboardData();
                        }
                    });
                });
            }

        } catch (err) {
            console.error('Error fetching feed items:', err);
        }

        // Example: hardcode one welcome item if empty
        if (items.length === 0) {
            items.push({
                id: 'welcome',
                type: 'info',
                title: t('welcomeMessage'),
                desc: t('allLooksQuiet'),
                date: 'Now'
            });
        }
        setFeedItems(items);
    }



    if (loading) {
        return (
            <div className="flex items-center justify-center h-[80vh]">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="h-4 w-32 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 pb-24 font-sans text-gray-900">
            {/* Header Section */}
            <div className="px-6 pt-8 pb-6 relative">
                {/* Branding - Final Logo Image - Absolute Center */}
                <div className="absolute left-1/2 top-8 md:top-10 -translate-x-1/2 flex items-center justify-center pointer-events-none">
                    <img src={logoFinalCleanV2} alt="RentMate" className="h-16 w-auto object-contain drop-shadow-sm" />
                </div>

                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                            {t('welcomeBack')}
                        </h2>
                        <h1 className="text-3xl font-bold text-gray-900 mt-1">
                            {profile?.first_name || profile?.full_name?.split(' ')[0] || 'משתמש'}
                        </h1>
                    </div>

                    {/* Branding - Centered/Top */}


                    <div className="flex items-center gap-2">
                        {/* <NotificationCenter /> */}
                        <button
                            onClick={() => navigate('/settings')}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                            aria-label="Settings"
                        >
                            <Settings className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Main Stats Card - Navy Theme */}
                <div className="bg-brand-navy text-white rounded-[2rem] p-6 shadow-xl shadow-brand-navy/20 relative overflow-hidden">
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>

                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-brand-navy-light text-blue-200/80 font-medium">
                                {t('monthlyIncome')}
                            </span>
                            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                                <TrendingUp className="w-5 h-5 text-white" />
                            </div>
                        </div>
                        <div className="text-4xl font-bold mb-6 tracking-tight">
                            ₪{stats.monthlyIncome.toLocaleString()}
                        </div>

                        {/* Mini Stats Row */}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                            <div>
                                <span className="text-xs text-blue-200/60 block mb-1">{t('collected')}</span>
                                <span className="text-lg font-semibold flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-green-400"></span>
                                    ₪{stats.collected.toLocaleString()}
                                </span>
                            </div>
                            <div>
                                <span className="text-xs text-blue-200/60 block mb-1">{t('pending')}</span>
                                <span className="text-lg font-semibold flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                                    ₪{stats.pending.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>





            {/* Recent Activity List */}
            <div className="px-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{t('recentActivity')}</h3>
                <div className="space-y-3">
                    {feedItems.map(item => (
                        <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${item.type === 'warning' ? 'bg-orange-50 text-orange-600' :
                                item.type === 'success' ? 'bg-green-50 text-green-600' :
                                    'bg-blue-50 text-blue-600'
                                }`}>
                                {item.type === 'warning' ? <AlertTriangle className="w-6 h-6" /> :
                                    item.type === 'urgent' ? <Clock className="w-6 h-6" /> :
                                        <Activity className="w-6 h-6" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-gray-900 text-sm">{item.title}</h4>
                                <p className="text-xs text-gray-500 truncate">{item.desc}</p>
                                {item.actionLabel && item.onAction && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            item.onAction?.();
                                        }}
                                        className="mt-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-900 px-3 py-1.5 rounded-lg font-medium transition-colors"
                                    >
                                        {item.actionLabel}
                                    </button>
                                )}
                            </div>
                            <div className="text-right shrink-0 self-start">
                                <span className={`text-xs font-bold ${item.title.includes('+') ? 'text-green-600' : 'text-gray-400'
                                    }`}>
                                    {item.date}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modals */}
            <ActionMenu
                // Hidden trigger, but logic kept if needed for floating action button in future
                align="right"
                onView={() => { }}
                onEdit={() => { }}
                onDelete={() => { }}
            />

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
        </div>
    );
}
