import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { SubscriptionPlanDef } from '../types/database';

export function useSubscription() {
    const [plan, setPlan] = useState<SubscriptionPlanDef | null>(null);
    const [usage, setUsage] = useState({
        properties: 0,
        tenants: 0,
        contracts: 0,
        activeContracts: 0,
        archivedContracts: 0
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

            // Mock Unlimited Plan for 'unlimited' ID
            if (planId === 'unlimited') {
                setPlan({
                    id: 'unlimited',
                    name: 'UNLIMITED',
                    max_properties: -1,
                    max_tenants: -1,
                    max_contracts: -1,
                    max_archived_contracts: -1,
                    max_sessions: -1,
                    max_whatsapp_messages: -1,
                    price_monthly: 0,
                    features: {
                        'legal_library': true,
                        'whatsapp_bot': true,
                        'maintenance_tracker': true,
                        'portfolio_visualizer': true,
                        'ai_analysis': true,
                        'ai_assistant': true,
                        'export_data': true
                    },
                    created_at: new Date().toISOString()
                });
            } else {
                setPlan(planData);
            }

            // 2. Get Usage Counts
            const [props, contractsRes] = await Promise.all([
                supabase.from('properties').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('contracts').select('status, tenants', { count: 'exact' }).eq('user_id', user.id)
            ]);

            const contractList = (contractsRes.data as any[]) || [];
            const tenantCount = contractList.reduce((acc, c) => acc + (Array.isArray(c.tenants) ? c.tenants.length : 1), 0);

            const activeContracts = contractList.filter(c => c.status === 'active').length;
            const archivedContracts = contractList.filter(c => c.status === 'archived').length;

            setUsage({
                properties: props.count || 0,
                tenants: tenantCount,
                contracts: contractsRes.count || 0,
                activeContracts,
                archivedContracts
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

    const canAddActiveContract = (() => {
        if (!plan) return false;

        // Free Plan Check: Limit to 1 TOTAL Contract (Active + Archived)
        // This forces upgrade if they have an archived contract and want a new one.
        if (plan.id === 'free' || plan.id === 'solo') {
            return usage.contracts < 1;
        }

        // Paid Plans: Limit based on Active Contracts only
        return checkLimit(usage.activeContracts, plan.max_contracts);
    })();

    const canArchiveContract = (() => {
        if (!plan) return false;
        if (plan.max_archived_contracts === undefined || plan.max_archived_contracts === null) return true; // Legacy/Unlimited fallback

        return checkLimit(usage.archivedContracts, plan.max_archived_contracts);
    })();

    return {
        plan,
        usage,
        loading,
        refreshSubscription,
        canAddProperty: true,
        canAddTenant: true,
        canAddContract: true,
        canAddActiveContract: true,
        canArchiveContract: true,

        // Feature flags helper
        hasFeature: (featureKey: string) => {
            if (plan?.id === 'unlimited') return true;
            if (!plan?.features) return false;
            return !!plan.features[featureKey];
        }
    };
}
