import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Star, Zap, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Plan {
    id: string;
    name: string;
    price_monthly: number;
    price_yearly: number;
    max_properties: number;
    max_tenants: number;
    features: {
        export_data?: boolean;
        priority_support?: boolean;
        api_access?: boolean;
        custom_branding?: boolean;
    };
}

export default function Pricing() {
    const navigate = useNavigate();
    const [plans, setPlans] = useState<Plan[]>([]);
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
        // Navigate to signup with plan pre-selected
        navigate(`/signup?plan=${planId}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
            {/* Header */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10 blur-3xl"></div>
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
                    <div className="text-center">
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight">
                            Simple, Transparent{' '}
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                                Pricing
                            </span>
                        </h1>
                        <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
                            Choose the perfect plan for your property management needs. Start free, upgrade anytime.
                        </p>

                        {/* Billing Toggle */}
                        <div className="mt-8 flex items-center justify-center gap-4">
                            <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
                                Monthly
                            </span>
                            <button
                                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                                className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                style={{ backgroundColor: billingCycle === 'yearly' ? '#3b82f6' : '#e5e7eb' }}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                            <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
                                Yearly
                                <span className="ml-1.5 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                                    Save 20%
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
                                        ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-2xl scale-105 z-10'
                                        : 'bg-white text-gray-900 shadow-lg'
                                    } p-8 transition-all hover:shadow-2xl hover:-translate-y-1`}
                            >
                                {isPro && (
                                    <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                                        <div className="inline-flex items-center rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-1 text-sm font-semibold text-white shadow-lg">
                                            ⭐ Most Popular
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-3">
                                    <div className={`rounded-xl p-2 ${isPro ? 'bg-white/20' : 'bg-blue-100'}`}>
                                        <Icon className={`w-6 h-6 ${isPro ? 'text-white' : 'text-blue-600'}`} />
                                    </div>
                                    <h3 className="text-2xl font-bold capitalize">{plan.name}</h3>
                                </div>

                                <div className="mt-6 flex items-baseline gap-2">
                                    <span className="text-5xl font-extrabold tracking-tight">${displayPrice}</span>
                                    <span className={`text-lg ${isPro ? 'text-white/80' : 'text-gray-500'}`}>
                                        /month
                                    </span>
                                </div>
                                {billingCycle === 'yearly' && (
                                    <p className={`mt-1 text-sm ${isPro ? 'text-white/70' : 'text-gray-500'}`}>
                                        Billed ${price}/year
                                    </p>
                                )}

                                <ul className="mt-8 space-y-4 flex-1">
                                    <li className="flex items-start gap-3">
                                        <CheckCircleIcon className={`w-5 h-5 flex-shrink-0 ${isPro ? 'text-white' : 'text-green-500'}`} />
                                        <span className="text-sm">
                                            {plan.max_properties === -1 ? 'Unlimited' : plan.max_properties} Properties
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <CheckCircleIcon className={`w-5 h-5 flex-shrink-0 ${isPro ? 'text-white' : 'text-green-500'}`} />
                                        <span className="text-sm">
                                            {plan.max_tenants === -1 ? 'Unlimited' : plan.max_tenants} Tenants
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        {plan.features?.export_data ? (
                                            <CheckCircleIcon className={`w-5 h-5 flex-shrink-0 ${isPro ? 'text-white' : 'text-green-500'}`} />
                                        ) : (
                                            <XCircleIcon className="w-5 h-5 flex-shrink-0 text-gray-300" />
                                        )}
                                        <span className={`text-sm ${!plan.features?.export_data && !isPro ? 'text-gray-400' : ''}`}>
                                            Data Export (CSV/PDF)
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        {plan.features?.priority_support ? (
                                            <CheckCircleIcon className={`w-5 h-5 flex-shrink-0 ${isPro ? 'text-white' : 'text-green-500'}`} />
                                        ) : (
                                            <XCircleIcon className="w-5 h-5 flex-shrink-0 text-gray-300" />
                                        )}
                                        <span className={`text-sm ${!plan.features?.priority_support && !isPro ? 'text-gray-400' : ''}`}>
                                            Priority Support
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        {plan.features?.api_access ? (
                                            <CheckCircleIcon className={`w-5 h-5 flex-shrink-0 ${isPro ? 'text-white' : 'text-green-500'}`} />
                                        ) : (
                                            <XCircleIcon className="w-5 h-5 flex-shrink-0 text-gray-300" />
                                        )}
                                        <span className={`text-sm ${!plan.features?.api_access && !isPro ? 'text-gray-400' : ''}`}>
                                            API Access
                                        </span>
                                    </li>
                                </ul>

                                <button
                                    onClick={() => handleGetStarted(plan.id)}
                                    className={`mt-8 w-full rounded-xl py-3 px-6 text-center text-sm font-semibold transition-all ${isPro
                                            ? 'bg-white text-blue-600 hover:bg-gray-100 shadow-lg'
                                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                                        }`}
                                >
                                    Get Started
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* FAQ or Additional Info */}
                <div className="mt-16 text-center">
                    <p className="text-gray-600">
                        Need a custom plan?{' '}
                        <a href="mailto:support@rentmate.com" className="font-semibold text-blue-600 hover:text-blue-700">
                            Contact our sales team
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
