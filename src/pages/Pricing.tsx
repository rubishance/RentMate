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
    extendedFeatures: TierFeature[];
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
    'mate': 'text-primary',
    'master': 'text-amber-500',
    'unlimited': 'text-primary'
};

const BG_MAP: Record<string, string> = {
    'solo': 'bg-background/50',
    'mate': 'bg-primary/10/50 dark:bg-blue-900/20',
    'master': 'bg-amber-50/50 dark:bg-amber-900/20',
    'unlimited': 'bg-primary-50/50 dark:bg-primary-900/20'
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
                    name: 'FREE',
                    price: 0,
                    description: isRtl ? 'שקט נפשי דיגיטלי לבעלי נכס יחיד.' : 'Digital peace of mind for the single-unit owner.',
                    features: [
                        { icon: Lock, text: isRtl ? 'נכס 1' : '1 Asset' },
                        { icon: FileText, text: isRtl ? 'חוזה 1 (כולל ארכיון)' : '1 Total Contract (Active + Archived)' },
                        { icon: MessageCircle, text: isRtl ? 'ללא AI וללא בוט וואטסאפ' : 'No AI & No WhatsApp Bot' },
                        { icon: Check, text: isRtl ? 'מעקב תחזוקה בסיסי' : 'Basic Maintenance Tracking' },
                    ],
                    extendedFeatures: [
                        { icon: Check, text: isRtl ? "מעקב הוצאות והכנסות ברמת נכס יחיד" : "Single Asset Income & Expense Tracking" },
                        { icon: Check, text: isRtl ? "ניהול חוזה אחד ותיוקו החכם בארכיון" : "Manage 1 Active Contract & Archive Smart Filing" },
                        { icon: Check, text: isRtl ? "תזכורות תקופתיות פשוטות לתחזוקה מצד השוכר" : "Simple Periodic Maintenance Reminders from Tenant" },
                    ],
                    cta: isRtl ? 'התחל בחינם' : 'Start for Free',
                    popular: false,
                    color: 'text-slate-500',
                    bg: 'bg-background/50'
                },
                {
                    id: 'pro',
                    name: 'PRO',
                    price: 49,
                    description: isRtl ? 'טייס אוטומטי מלא משקיעים ומנהלי נכסים קטנים.' : 'Full autopilot for growing investors and managers.',
                    features: [
                        { icon: Lock, text: isRtl ? 'עד 3 נכסים' : 'Up to 3 Assets' },
                        { icon: FileText, text: isRtl ? '3 חוזים פעילים (+15 בארכיון)' : '3 Active Contracts (+15 Archived)' },
                        { icon: Zap, text: isRtl ? 'כלים מתקדמים: AI, פרוטוקולים, סינון' : 'Advanced: AI, protocols, screening' },
                        { icon: MessageCircle, text: isRtl ? 'בוט וואטסאפ ייעודי' : 'Dedicated WhatsApp Bot' },
                    ],
                    extendedFeatures: [
                        { icon: Check, text: isRtl ? "כל הפיצ'רים של תוכנית Free" : "All Free Plan Features" },
                        { icon: Zap, text: isRtl ? "עוזר AI אישי לשליחת הודעות מנוסחות לוואטסאפ השוכר" : "Personal AI Assistant for drafting WhatsApp messages to Tenant" },
                        { icon: Shield, text: isRtl ? "סינון וניהול מועמדים דיגיטלי לדירה" : "Fast Tenant Screening & Application Flow" },
                        { icon: FileText, text: isRtl ? "מעקב וניהול מתקדם של תזרים צ'קים דחויים" : "Advanced Post-dated Checks Flow Management" },
                        { icon: Lock, text: isRtl ? "גיבוי ענן מאובטח לכל המסמכים והסרטונים של הנכס" : "Secure Cloud Backup for All Docs & Videos" },
                        { icon: FileText, text: isRtl ? "גישה מלאה לספרייה המשפטית העדכנית" : "Full Access to Updated Legal Library" },
                        { icon: Bell, text: isRtl ? "התראות חכמות למימוש אופציה ועדכון שכר דירה" : "Smart alerts for extending options & rent updates" },
                    ],
                    cta: isRtl ? 'שדרג ל-Pro' : 'Upgrade to Pro',
                    popular: true,
                    color: 'text-primary',
                    bg: 'bg-primary/10/50 dark:bg-blue-900/20'
                },
                {
                    id: 'investor',
                    name: 'INVESTOR',
                    price: 119,
                    description: isRtl ? 'מעטפת פרימיום למשקיעים רציניים.' : 'Premium suite for serious investors.',
                    features: [
                        { icon: Lock, text: isRtl ? 'עד 10 נכסים' : 'Up to 10 Assets' },
                        { icon: FileText, text: isRtl ? 'הכל כולל הכל מתוכנית ה-Pro' : 'Everything included in the Pro Plan' },
                        { icon: Zap, text: isRtl ? 'כלים ייחודיים למשקיעים' : 'Unique tools for investors' },
                        { icon: MessageCircle, text: isRtl ? 'תמיכת VIP אישית' : 'Personal VIP Support' },
                    ],
                    extendedFeatures: [
                        { icon: Check, text: isRtl ? "כל הפיצ'רים של תוכנית Pro" : "All Pro Plan Features" },
                        { icon: FileText, text: isRtl ? "הפקת דוחות מס בלחיצת כפתור לשקיפות מול רואה החשבון" : "Generate Tax Reports in 1-Click for CPA" },
                        { icon: PieChart, text: isRtl ? "ניהול משולב לפורטפוליו ומספר רב של נכסים" : "Integrated Multi-Asset Portfolio Management" },
                        { icon: MessageCircle, text: isRtl ? "טיפול בתקלות בעדיפות עליונה מול אנשי מקצוע" : "Top Priority Support Queuing for Professionals" },
                        { icon: Zap, text: isRtl ? "גישה מוקדמת (Beta) לפיצ'רים עתידיים לפני כולם" : "Early Access (Beta) to Future Features" },
                    ],
                    cta: isRtl ? 'שדרג ל-Investor' : 'Upgrade to Investor',
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
                features: plan.features,
                extendedFeatures: plan.extendedFeatures
            }));

            setTiers(mappedTiers);
        } catch (error) {
            console.error('Error fetching plans:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background dark:bg-black pt-20 px-4">
            <div className="max-w-6xl mx-auto space-y-12">

                {/* Header */}
                <div className="text-center space-y-4">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-5xl font-black tracking-tight text-foreground"
                    >
                        {t('pricing_title')}
                    </motion.h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        {t('pricing_subtitle')}
                    </p>

                    {/* Billing Toggle */}
                    <div className="flex items-center justify-center gap-3 pt-6">
                        <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-foreground' : 'text-slate-500'}`}>{t('pricing_monthly')}</span>
                        <button
                            onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
                            className="w-14 h-8 bg-muted rounded-full p-1 transition-colors relative"
                        >
                            <motion.div
                                animate={{ x: billingCycle === 'monthly' ? (isRtl ? 24 : 0) : (isRtl ? 0 : 24) }}
                                className="w-6 h-6 bg-white dark:bg-primary rounded-full shadow-sm"
                            />
                        </button>
                        <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-foreground' : 'text-slate-500'}`}>
                            {t('pricing_yearly')} <span className="text-green-600 text-xs font-bold bg-green-100 px-2 py-0.5 rounded-full ml-1">{t('pricing_save', { percent: '20%' })}</span>
                        </span>
                    </div>
                </div>

                {/* Grid */}
                <div className="relative">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
                            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{t('curating_plans')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
                            {tiers.map((tier) => (
                                <GlassCard
                                    key={tier.id}
                                    className={`p-8 relative flex flex-col ${tier.isPopular ? 'border-primary/50 ring-4 ring-primary/10' : ''} ${tier.bg}`}
                                    hoverEffect
                                >
                                    {tier.badgeText && (
                                        <div className="absolute -top-4 inset-x-0 flex justify-center">
                                            <span className="bg-gradient-to-r from-primary to-cyan-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg uppercase tracking-widest">
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

                                    <p className="text-muted-foreground font-medium mb-8">
                                        {tier.description}
                                    </p>

                                    <div className="space-y-4 flex-1">
                                        {tier.features.map((feature, fIdx) => (
                                            <div key={fIdx} className="flex items-center gap-3 text-sm">
                                                <div className="p-1 rounded-full bg-secondary/10 text-green-600">
                                                    <Check className="w-3 h-3" />
                                                </div>
                                                <span className="text-foreground/80">{feature.text}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => navigate('/login?plan=' + tier.id)}
                                        className={`w-full mt-8 py-3 rounded-xl font-bold transition-all ${tier.buttonVariant === 'primary'
                                            ? 'bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-blue-500/25'
                                            : 'bg-card border border-border hover:border-slate-300 text-foreground'
                                            }`}
                                    >
                                        {tier.ctaText || (tier.price === 0 ? t('pricing_get_started') : t('pricing_start_free_trial'))}
                                    </button>

                                </GlassCard>
                            ))}
                        </div>
                    )}
                </div>

                {/* Full Breakdown Section */}
                {!loading && (
                    <div className="mt-20 max-w-5xl mx-auto">
                        <div className="text-center mb-10">
                            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
                                {isRtl ? "השוואת מסלולים מלאה" : "Full Feature Breakdown"}
                            </h2>
                            <p className="text-muted-foreground mt-2">
                                {isRtl
                                    ? "כל הכלים והיכולות שתקבלו בכל מסלול, לפרטי פרטים."
                                    : "Everything included in each plan, in detail."}
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {tiers.map((tier) => (
                                <div
                                    key={`breakdown-${tier.id}`}
                                    className="bg-muted/30 dark:bg-muted/10 rounded-2xl p-6 border border-border/50"
                                >
                                    <h3
                                        className={`font-bold text-xl mb-6 flex items-center gap-2 ${tier.color}`}
                                    >
                                        <tier.icon className="w-5 h-5" />
                                        {tier.name}
                                    </h3>

                                    <div className="space-y-4">
                                        {/* Show extended features */}
                                        {tier.extendedFeatures.map((extFeature, fIdx) => (
                                            <div
                                                key={`ext-${fIdx}`}
                                                className="flex items-start gap-3 text-sm"
                                            >
                                                <div className="p-1.5 rounded-full bg-secondary/20 text-primary shrink-0 mt-0.5">
                                                    <extFeature.icon className="w-3.5 h-3.5" strokeWidth={2.5} />
                                                </div>
                                                <span className="text-foreground/90 font-medium">
                                                    {extFeature.text}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="mt-8 pt-6 border-t border-border/50">
                                        <button
                                            onClick={() => navigate('/login?plan=' + tier.id)}
                                            className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${
                                                tier.buttonVariant === 'primary'
                                                ? 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/30'
                                                : 'bg-muted/50 hover:bg-muted text-foreground border border-border'
                                            }`}
                                        >
                                            {tier.ctaText || (tier.price === 0 ? t('pricing_get_started') : t('pricing_start_free_trial'))}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* FAQ Section */}
                <div className="mt-24 max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-black tracking-tight text-foreground">
                            {isRtl ? "שאלות נפוצות" : "Frequently Asked Questions"}
                        </h2>
                        <p className="text-muted-foreground mt-2 text-lg">
                            {isRtl ? "כל מה שצריך לדעת לפני שמתחילים." : "Everything you need to know before getting started."}
                        </p>
                    </div>
                    <div className="grid gap-4">
                        {[
                            {
                                q: isRtl ? "האם יש תקופת התחייבות?" : "Is there a commitment period?",
                                a: isRtl 
                                    ? "לא! המסלול החודשי שלנו הוא ללא התחייבות וניתן לביטול בכל רגע. המסלול השנתי מציע הנחה משמעותית אך גם אותו ניתן להפסיק בכפוף למדיניות הביטולים שלנו." 
                                    : "No! Our monthly plan is commitment-free and can be canceled anytime. The annual plan offers a significant discount but can also be stopped subject to our cancellation policy."
                            },
                            {
                                q: isRtl ? "מי נחשב 'נכס' במערכת?" : "What counts as an 'Asset' in the system?",
                                a: isRtl 
                                    ? "נכס הוא כל יחידת דיור שמושכרת בנפרד ומייצרת תזרים מניב עצמאי (למשל, דירה, חנות, יחידת דיור נפרדת). אם דירה מפוצלת ל-3 יחידות דיור - כל יחידה נספרת כנכס." 
                                    : "An asset is any separate rental unit that generates independent revenue (e.g., apartment, store, separate housing unit). If an apartment is split into 3 units, each unit counts as an asset."
                            },
                            {
                                q: isRtl ? "האם המידע שלי מאובטח?" : "Is my data secure?",
                                a: isRtl 
                                    ? "בוודאי. אנו משתמשים בטכנולוגיות ההצפנה והאבטחה המתקדמות ביותר כדי להבטיח שהמידע, המסמכים והחוזים שלך יישארו פרטיים ומאובטחים בענן." 
                                    : "Absolutely. We use the most advanced encryption and security technologies to ensure your information, documents, and contracts remain private and secure in the cloud."
                            },
                            {
                                q: isRtl ? "מה קורה אם יש לי יותר מ-10 נכסים?" : "What if I have more than 10 properties?",
                                a: isRtl 
                                    ? "למשקיעים ומוסדות בעלי מעל ל-10 נכסים בניווט פרימיום, אנו מציעים בניית תיק ניהול בהתאמה אישית. צרו קשר עם מחלקת העסקים שלנו." 
                                    : "For investors and institutions with over 10 properties, we offer custom-tailored management portfolio building. Contact our business department."
                            }
                        ].map((faq, i) => (
                            <details key={i} className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-colors">
                                <summary className="flex cursor-pointer items-center justify-between p-6 font-bold marker:content-none text-foreground">
                                    <span className="text-lg pr-4">{faq.q}</span>
                                    <span className="relative flex shrink-0 items-center justify-center p-2 rounded-full bg-secondary text-primary group-open:bg-primary group-open:text-primary-foreground transition-all duration-300">
                                        <svg className="h-4 w-4 transition-transform duration-300 group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </span>
                                </summary>
                                <div className="px-6 pb-6 text-muted-foreground leading-relaxed animate-in fade-in slide-in-from-top-2 duration-300 text-base border-t border-border/50 pt-4">
                                    <p>{faq.a}</p>
                                </div>
                            </details>
                        ))}
                    </div>
                </div>

                <div className="text-center pt-20 text-slate-400 text-sm">
                    <p>{t('pricing_need_custom_plan')} <span className="underline cursor-pointer hover:text-primary" onClick={() => navigate('/contact')}>{t('pricing_contact_sales_link')}</span></p>
                </div>

            </div>
        </div>
    );
}
