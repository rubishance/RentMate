import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Star, Zap, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../hooks/useTranslation';

export default function Pricing() {
    const navigate = useNavigate();
    const { t, lang } = useTranslation();
    const isRtl = lang === 'he';

    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const { data, error } = await supabase
                .from('subscription_plans')
                .select('*')
                .order('price_monthly', { ascending: true });

            if (error) throw error;
            setPlans(data || []);
        } catch (error) {
            console.error('Error fetching plans:', error);
        } finally {
            setLoading(false);
        }
    };

    const getPlanIcon = (planName: string) => {
        const name = planName.toLowerCase();
        if (name.includes('free')) return Star;
        if (name.includes('pro')) return Zap;
        if (name.includes('enterprise')) return Shield;
        return Star;
    };

    const handleGetStarted = (planId: string) => {
        navigate(`/login?mode=signup&plan=${planId}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 pt-20 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
            {/* Header */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-cyan-600/10 to-emerald-600/10 blur-3xl"></div>
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
                    <div className="text-center">
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground tracking-tight">
                            {t('pricing_title').split('Price')[0]}{' '}
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-600">
                                {t('pricing_title').includes('Price') ? 'Pricing' : t('pricing_title').split(' ').pop()}
                            </span>
                        </h1>
                        <p className="mt-6 text-xl text-muted-foreground max-w-3xl mx-auto">
                            {t('pricing_subtitle')}
                        </p>

                        {/* Billing Toggle */}
                        <div className="mt-8 flex items-center justify-center gap-4">
                            <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {t('pricing_monthly')}
                            </span>
                            <button
                                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                                className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-200 transition-colors focus:outline-none"
                                style={{ backgroundColor: billingCycle === 'yearly' ? '#3b82f6' : '#e5e7eb' }}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${billingCycle === 'yearly' ? (isRtl ? '-translate-x-6' : 'translate-x-6') : (isRtl ? '-translate-x-1' : 'translate-x-1')
                                        }`}
                                />
                            </button>
                            <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {t('pricing_yearly')}
                                <span className={`ml-1.5 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 ${isRtl ? 'mr-1.5 ml-0' : ''}`}>
                                    {t('pricing_save')}
                                </span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pricing Cards */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    {plans.map((plan, index) => {
                        const Icon = getPlanIcon(plan.name);
                        const isPro = plan.name.toLowerCase().includes('pro');
                        const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
                        const displayPrice = billingCycle === 'yearly' ? (price / 12).toFixed(0) : price;

                        return (
                            <div
                                key={plan.id}
                                className={`relative flex flex-col rounded-3xl ${isPro
                                    ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-2xl scale-105 z-10'
                                    : 'bg-white text-foreground shadow-lg'
                                    } p-8 transition-all hover:shadow-2xl hover:-translate-y-1`}
                            >
                                {isPro && (
                                    <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                                        <div className="inline-flex items-center rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-1 text-sm font-semibold text-white shadow-lg whitespace-nowrap">
                                            ⭐ {t('pricing_most_popular')}
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-3">
                                    <div className={`rounded-xl p-2 ${isPro ? 'bg-white/20' : 'bg-primary/10'}`}>
                                        <Icon className={`w-6 h-6 ${isPro ? 'text-white' : 'text-primary'}`} />
                                    </div>
                                    <h3 className="text-2xl font-bold capitalize">{plan.name}</h3>
                                </div>

                                <div className="mt-6 flex items-baseline gap-2">
                                    <span className="text-5xl font-extrabold tracking-tight">₪{displayPrice}</span>
                                    <span className={`text-lg ${isPro ? 'text-white/80' : 'text-muted-foreground'}`}>
                                        {t('pricing_per_month')}
                                    </span>
                                </div>
                                {billingCycle === 'yearly' && (
                                    <p className={`mt-1 text-sm ${isPro ? 'text-white/70' : 'text-muted-foreground'}`}>
                                        {t('pricing_billed_yearly').replace('${price}', price.toString())}
                                    </p>
                                )}

                                <ul className="mt-8 space-y-4 flex-1">
                                    <li className="flex items-start gap-3">
                                        <CheckCircleIcon className={`w-5 h-5 flex-shrink-0 ${isPro ? 'text-white' : 'text-green-500'}`} />
                                        <span className="text-sm">
                                            {plan.max_properties === -1 ? '∞' : plan.max_properties} {t('pricing_properties')}
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <CheckCircleIcon className={`w-5 h-5 flex-shrink-0 ${isPro ? 'text-white' : 'text-green-500'}`} />
                                        <span className="text-sm">
                                            {plan.max_tenants === -1 ? '∞' : plan.max_tenants} {t('pricing_tenants')}
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        {plan.features?.export_data ? (
                                            <CheckCircleIcon className={`w-5 h-5 flex-shrink-0 ${isPro ? 'text-white' : 'text-green-500'}`} />
                                        ) : (
                                            <XCircleIcon className="w-5 h-5 flex-shrink-0 text-slate-300" />
                                        )}
                                        <span className={`text-sm ${!plan.features?.export_data && !isPro ? 'text-muted-foreground' : ''}`}>
                                            {t('pricing_data_export')}
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        {plan.features?.priority_support ? (
                                            <CheckCircleIcon className={`w-5 h-5 flex-shrink-0 ${isPro ? 'text-white' : 'text-green-500'}`} />
                                        ) : (
                                            <XCircleIcon className="w-5 h-5 flex-shrink-0 text-slate-300" />
                                        )}
                                        <span className={`text-sm ${!plan.features?.priority_support && !isPro ? 'text-muted-foreground' : ''}`}>
                                            {t('pricing_priority_support')}
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        {plan.features?.api_access ? (
                                            <CheckCircleIcon className={`w-5 h-5 flex-shrink-0 ${isPro ? 'text-white' : 'text-green-500'}`} />
                                        ) : (
                                            <XCircleIcon className="w-5 h-5 flex-shrink-0 text-slate-300" />
                                        )}
                                        <span className={`text-sm ${!plan.features?.api_access && !isPro ? 'text-muted-foreground' : ''}`}>
                                            {t('pricing_api_access')}
                                        </span>
                                    </li>
                                </ul>

                                <button
                                    onClick={() => handleGetStarted(plan.id)}
                                    className={`mt-8 w-full rounded-xl py-3 px-6 text-center text-sm font-semibold transition-all ${isPro
                                        ? 'bg-white text-primary hover:bg-slate-50 shadow-lg'
                                        : 'bg-primary text-white hover:bg-primary/90 shadow-md'
                                        }`}
                                >
                                    {t('pricing_get_started')}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* FAQ or Additional Info */}
                <div className="mt-16 text-center">
                    <p className="text-muted-foreground">
                        {t('pricing_custom_plan')}{' '}
                        <a href="mailto:support@rentmate.com" className="font-semibold text-primary hover:text-primary underline">
                            {t('pricing_contact_sales')}
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
