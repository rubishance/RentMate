import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { SubscriptionPlanDef } from '../types/database';

export function useSubscription() {
    const [plan, setPlan] = useState<SubscriptionPlanDef | null>(null);
    const [usage, setUsage] = useState({
        properties: 0,
        tenants: 0,
        contracts: 0
    });
    const [loading, setLoading] = useState(true);

    const refreshSubscription = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            // 1. Get User Plan
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('plan_id')
                .eq('id', user.id)
                .single();

            const planId = profile?.plan_id || 'free';

            const { data: planData } = await supabase
                .from('subscription_plans')
                .select('*')
                .eq('id', planId)
                .single();

            setPlan(planData);

            // 2. Get Usage Counts
            const [props, tenants, contracts] = await Promise.all([
                supabase.from('properties').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
            ]);

            setUsage({
                properties: props.count || 0,
                tenants: tenants.count || 0,
                contracts: contracts.count || 0
            });

        } catch (error) {
            console.error('Error loading subscription:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshSubscription();
    }, []);

    const checkLimit = (current: number, max: number) => {
        if (max === -1) return true; // Unlimited
        return current < max;
    };

    return {
        plan,
        usage,
        loading,
        refreshSubscription,
        canAddProperty: plan ? checkLimit(usage.properties, plan.max_properties) : false,
        canAddTenant: plan ? checkLimit(usage.tenants, plan.max_tenants) : false,
        canAddContract: plan ? checkLimit(usage.contracts, plan.max_contracts) : false,

        // Feature flags helper
        hasFeature: (featureKey: string) => {
            if (!plan?.features) return false;
            return !!plan.features[featureKey];
        }
    };
}
