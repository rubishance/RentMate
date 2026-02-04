import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Star, Zap, Shield, MessageCircle, FileText, PieChart, Bell, Lock, Loader2 } from 'lucide-react';
import { GlassCard } from '../components/common/GlassCard';
import { useTranslation } from '../hooks/useTranslation';
import { supabase } from '../lib/supabase';

interface TierFeature {
    icon: any;
    text: string;
}

interface Tier {
    id: string;
    name: string;
    price: number;
    priceYearly?: number;
    description: string;
    subtitle: string | null;
    badgeText: string | null;
    ctaText: string | null;
    icon: any;
    color: string;
    bg: string;
    isPopular?: boolean;
    buttonVariant: 'primary' | 'outline';
    features: TierFeature[];
}

const ICON_MAP: Record<string, any> = {
    'solo': Star,
    'free': Star,
    'mate': Zap,
    'pro': Zap,
    'master': Shield,
    'enterprise': Shield,
    'unlimited': Lock
};

const COLOR_MAP: Record<string, string> = {
    'solo': 'text-slate-500',
    'mate': 'text-blue-500',
    'master': 'text-amber-500',
    'unlimited': 'text-purple-500'
};

const BG_MAP: Record<string, string> = {
    'solo': 'bg-slate-50 dark:bg-slate-900/50',
    'mate': 'bg-blue-50/50 dark:bg-blue-900/20',
    'master': 'bg-amber-50/50 dark:bg-amber-900/20',
    'unlimited': 'bg-purple-50/50 dark:bg-purple-900/20'
};

const FEATURE_ICON_MAP: Record<string, any> = {
    'legal_library': Shield,
    'whatsapp_bot': MessageCircle,
    'maintenance_tracker': PieChart,
    'portfolio_visualizer': PieChart,
    'ai_analysis': Zap,
    'export_data': FileText,
    'custom_reports': FileText,
    'priority_support': MessageCircle,
    'can_export': FileText,
    'ai_assistant': Zap,
    'bill_analysis': FileText,
    'api_access': Lock
};

export default function Pricing() {
    const navigate = useNavigate();
    const { t, lang } = useTranslation();
    const isRtl = lang === 'he';

    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [tiers, setTiers] = useState<Tier[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('subscription_plans')
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (error) throw error;

            const mappedTiers: Tier[] = (data || []).map(plan => {
                const id = plan.id.toLowerCase();
                const baseId = id.includes('solo') || id.includes('free') ? 'solo' :
                    id.includes('mate') || id.includes('pro') ? 'mate' :
                        id.includes('master') || id.includes('enterprise') ? 'master' : 'unlimited';

                // Map features from JSONB
                const features: TierFeature[] = [];
                if (plan.max_properties === -1) {
                    features.push({ icon: Lock, text: t('unlimited_properties') });
                } else if (plan.max_properties === 1) {
                    features.push({ icon: Lock, text: `1 ${t('property_unit')}` });
                } else {
                    features.push({ icon: Lock, text: `${plan.max_properties} ${t('property_units')}` });
                }

                if (plan.features && typeof plan.features === 'object') {
                    Object.entries(plan.features).forEach(([key, value]) => {
                        if (value === true) {
                            features.push({
                                icon: FEATURE_ICON_MAP[key] || Check,
                                text: t(key as any) // Use key as fallback if t handles it
                            });
                        }
                    });
                }

                return {
                    id: plan.id,
                    name: plan.name,
                    price: plan.price_monthly,
                    priceYearly: plan.price_yearly || plan.price_monthly * 10, // Fallback if 0
                    description: plan.description || (
                        plan.id === 'free' ? (isRtl ? 'שקט נפשי דיגיטלי לבעלי נכס יחיד.' : 'Digital peace of mind for the single-unit owner.') :
                            plan.id === 'mate' ? (isRtl ? 'אופטימיזציית תשואה לבעלי נכסים בצמיחה.' : 'The Yield Optimizer for growth-minded owners.') :
                                plan.id === 'enterprise' ? (isRtl ? 'מרכז בקרה עסקי למשקיעי נדל"ן.' : 'Business Command Center for portfolio investors.') :
                                    (isRtl ? 'פיצ\'רים מתקדמים למקצוענים' : 'Advanced features for professionals')
                    ),
                    subtitle: plan.subtitle,
                    badgeText: plan.badge_text,
                    ctaText: plan.cta_text,
                    icon: ICON_MAP[baseId] || Star,
                    color: COLOR_MAP[baseId] || 'text-blue-500',
                    bg: BG_MAP[baseId] || 'bg-blue-50/50 dark:bg-blue-900/20',
                    isPopular: baseId === 'mate' || !!plan.badge_text,
                    buttonVariant: baseId === 'mate' ? 'primary' : 'outline',
                    features: features.slice(0, 5) // Keep it clean
                };
            });

            setTiers(mappedTiers);
        } catch (error) {
            console.error('Error fetching plans:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black pt-20 pb-20 px-4">
            <div className="max-w-6xl mx-auto space-y-12">

                {/* Header */}
                <div className="text-center space-y-4">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white"
                    >
                        {t('pricing_title')}
                    </motion.h1>
                    <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                        {t('pricing_subtitle')}
                    </p>

                    {/* Billing Toggle */}
                    <div className="flex items-center justify-center gap-3 pt-6">
                        <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{t('pricing_monthly')}</span>
                        <button
                            onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
                            className="w-14 h-8 bg-slate-200 dark:bg-slate-800 rounded-full p-1 transition-colors relative"
                        >
                            <motion.div
                                animate={{ x: billingCycle === 'monthly' ? (isRtl ? 24 : 0) : (isRtl ? 0 : 24) }}
                                className="w-6 h-6 bg-white dark:bg-blue-500 rounded-full shadow-sm"
                            />
                        </button>
                        <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                            {t('pricing_yearly')} <span className="text-green-600 text-xs font-bold bg-green-100 px-2 py-0.5 rounded-full ml-1">{t('pricing_save', { percent: '20%' })}</span>
                        </span>
                    </div>
                </div>

                {/* Grid */}
                <div className="relative">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
                            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{t('curating_plans')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
                            {tiers.map((tier) => (
                                <GlassCard
                                    key={tier.id}
                                    className={`p-8 relative flex flex-col ${tier.isPopular ? 'border-blue-500/50 ring-4 ring-blue-500/10' : ''} ${tier.bg}`}
                                    hoverEffect
                                >
                                    {tier.badgeText && (
                                        <div className="absolute -top-4 inset-x-0 flex justify-center">
                                            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg uppercase tracking-widest">
                                                {tier.badgeText}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3 mb-6">
                                        <div className={`p-3 rounded-xl bg-white dark:bg-black/40 shadow-sm ${tier.color}`}>
                                            <tier.icon className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-2xl font-bold font-mono tracking-tight">{tier.name}</h3>
                                    </div>

                                    <div className="mb-6">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-black">
                                                ₪{billingCycle === 'monthly' ? tier.price : Math.round((tier.priceYearly || tier.price * 10) / 12)}
                                            </span>
                                            <span className="text-slate-500 font-medium">{t('pricing_per_unit')}</span>
                                        </div>
                                        <p className="text-sm text-slate-500 mt-1">
                                            {billingCycle === 'monthly' ? t('pricing_billed_monthly') : t('pricing_billed_yearly', { amount: tier.priceYearly || 0 })}
                                        </p>
                                    </div>

                                    <p className="text-slate-600 dark:text-slate-300 font-medium mb-8">
                                        {tier.description}
                                    </p>

                                    <div className="space-y-4 flex-1">
                                        {tier.features.map((feature, fIdx) => (
                                            <div key={fIdx} className="flex items-center gap-3 text-sm">
                                                <div className="p-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600">
                                                    <Check className="w-3 h-3" />
                                                </div>
                                                <span className="text-slate-700 dark:text-slate-300">{feature.text}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => navigate('/login?plan=' + tier.id)}
                                        className={`w-full mt-8 py-3 rounded-xl font-bold transition-all ${tier.buttonVariant === 'primary'
                                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/25'
                                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-900 dark:text-white'
                                            }`}
                                    >
                                        {tier.ctaText || (tier.price === 0 ? t('pricing_get_started') : t('pricing_start_free_trial'))}
                                    </button>

                                </GlassCard>
                            ))}
                        </div>
                    )}
                </div>

                <div className="text-center pt-12 text-slate-400 text-sm">
                    <p>{t('pricing_need_custom_plan')} <span className="underline cursor-pointer hover:text-blue-500" onClick={() => navigate('/contact')}>{t('pricing_contact_sales_link')}</span></p>
                </div>

            </div>
        </div>
    );
}
