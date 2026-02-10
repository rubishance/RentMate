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
            // Define static plans based on requirements since DB might not be updated yet
            const plans = [
                {
                    id: 'free',
                    name: 'BASIC',
                    price: 0,
                    description: isRtl ? 'שקט נפשי דיגיטלי לבעלי נכס יחיד.' : 'Digital peace of mind for the single-unit owner.',
                    features: [
                        { icon: Lock, text: isRtl ? 'נכס 1' : '1 Asset' },
                        { icon: FileText, text: isRtl ? 'חוזה 1 (כולל ארכיון)' : '1 Total Contract (Active + Archived)' },
                        { icon: MessageCircle, text: isRtl ? 'ללא AI וללא בוט וואטסאפ' : 'No AI & No WhatsApp Bot' },
                        { icon: Check, text: isRtl ? 'מעקב תחזוקה בסיסי' : 'Basic Maintenance Tracking' },
                    ],
                    cta: isRtl ? 'התחל בחינם' : 'Start for Free',
                    popular: false,
                    color: 'text-slate-500',
                    bg: 'bg-slate-50 dark:bg-slate-900/50'
                },
                {
                    id: 'mate', // Starter
                    name: 'STARTER',
                    price: 29,
                    description: isRtl ? 'ניהול מקצועי עם AI לבעלי דירה אחת.' : 'Professional management with AI for single owners.',
                    features: [
                        { icon: Lock, text: isRtl ? 'נכס 1' : '1 Asset' },
                        { icon: FileText, text: isRtl ? 'חוזה פעיל 1 (+3 בארכיון)' : '1 Active Contract (+3 Archived)' },
                        { icon: Zap, text: isRtl ? 'כולל כלי AI מלאים' : 'Includes Full AI Tools' },
                        { icon: MessageCircle, text: isRtl ? 'תזכורות בוואטסאפ' : 'WhatsApp Reminders' },
                        { icon: FileText, text: isRtl ? 'יצוא נתונים' : 'Data Export' }
                    ],
                    cta: isRtl ? 'שדרג ל-Starter' : 'Upgrade to Starter',
                    popular: true,
                    color: 'text-blue-500',
                    bg: 'bg-blue-50/50 dark:bg-blue-900/20'
                },
                {
                    id: 'pro', // Pro
                    name: 'PRO',
                    price: 59,
                    description: isRtl ? 'טייס אוטומטי מלא למשקיעים צומחים.' : 'Full autopilot for growing investors.',
                    features: [
                        { icon: Lock, text: isRtl ? 'עד 3 נכסים' : 'Up to 3 Assets' },
                        { icon: FileText, text: isRtl ? '3 חוזים פעילים (+15 בארכיון)' : '3 Active Contracts (+15 Archived)' },
                        { icon: Zap, text: isRtl ? 'AI וניתוח תשואה מתקדם' : 'AI & Advanced Yield Analysis' },
                        { icon: MessageCircle, text: isRtl ? 'תמיכה בעדיפות גבוהה' : 'Priority Support' },
                        { icon: Check, text: isRtl ? 'כל מה שיש ב-Starter' : 'Everything in Starter' }
                    ],
                    cta: isRtl ? 'שדרג ל-Pro' : 'Upgrade to Pro',
                    popular: false,
                    color: 'text-amber-500',
                    bg: 'bg-amber-50/50 dark:bg-amber-900/20'
                }
            ];

            // Map to Tier format
            const mappedTiers: Tier[] = plans.map(plan => ({
                id: plan.id,
                name: plan.name,
                price: plan.price,
                priceYearly: plan.price * 10,
                description: plan.description,
                subtitle: null,
                badgeText: plan.popular ? (isRtl ? 'הכי משתלם' : 'BEST VALUE') : null,
                ctaText: plan.cta,
                icon: ICON_MAP[plan.id] || Star,
                color: plan.color,
                bg: plan.bg,
                isPopular: plan.popular,
                buttonVariant: plan.id === 'mate' ? 'primary' : 'outline',
                features: plan.features
            }));

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
