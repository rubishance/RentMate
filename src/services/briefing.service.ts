import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/utils';
import { startOfDay, isBefore, addDays } from 'date-fns';

export interface FeedItem {
    id: string;
    type: 'warning' | 'info' | 'success' | 'urgent' | 'action';
    title: string;
    desc: string;
    date: string;
    actionLabel?: string;
    onAction?: () => void;
    metadata?: any;
}

export const BriefingService = {
    async getBriefingItems(userId: string, t: (key: string, params?: any) => string): Promise<FeedItem[]> {
        const items: FeedItem[] = [];
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        try {
            // 1. Expired Contracts
            const { data: expired } = await supabase
                .from('contracts')
                .select('*, properties(city, address)')
                .eq('user_id', userId)
                .eq('status', 'active')
                .lt('end_date', todayStr);

            expired?.forEach((c: any) => {
                const property = Array.isArray(c.properties) ? c.properties[0] : c.properties;
                const address = property?.address || t('unknownProperty');

                items.push({
                    id: `expired-${c.id}`,
                    type: 'warning',
                    title: t('contractEnded'),
                    desc: `${address} • ${t('contractExpiringSoon')}`,
                    date: formatDate(new Date(c.end_date)),
                    actionLabel: t('calculate'),
                    metadata: { type: 'contract_expired', contractId: c.id }
                });
            });

            // 2. Overdue Payments (e.g., due date passed, status='pending')
            // Fetch payments due before today and still pending
            const { data: overdue } = await supabase
                .from('payments')
                .select('*, contracts(properties(address), tenants(full_name))')
                .eq('user_id', userId)
                .eq('status', 'pending')
                .lt('due_date', todayStr)
                .order('due_date', { ascending: true })
                .limit(5); // Limit to top 5 to avoid clutter

            overdue?.forEach((p: any) => {
                const property = p.contracts?.properties?.address || t('unknownProperty');
                const tenant = p.contracts?.tenants?.full_name || t('unknown');

                items.push({
                    id: `overdue-${p.id}`,
                    type: 'urgent',
                    title: t('paymentOverdue'),
                    desc: `${property} • ${tenant} • ${p.amount} ${p.currency}`,
                    date: formatDate(new Date(p.due_date)),
                    actionLabel: t('sendReminder'),
                    metadata: { type: 'payment_overdue', paymentId: p.id, tenantParams: { name: tenant, amount: p.amount } }
                });
            });

            // 3. Open Maintenance Requests (status='open' or 'in_progress')
            const { data: maintenance } = await supabase
                .from('maintenance_requests')
                .select('*, properties(address)')
                .eq('user_id', userId)
                .in('status', ['open', 'in_progress'])
                .order('created_at', { ascending: false })
                .limit(3);

            maintenance?.forEach((m: any) => {
                const property = m.properties?.address || t('unknownProperty');

                items.push({
                    id: `maint-${m.id}`,
                    type: 'action',
                    title: t('activeMaintenanceTitle'), // "Active Maintenance"
                    desc: `${property} • ${t(m.category) || m.category}`,
                    date: formatDate(new Date(m.created_at)),
                    metadata: { type: 'maintenance_active', requestId: m.id }
                });
            });

            // 4. Stalled Onboarding (Properties > 0, Contracts = 0)
            const [props, contracts] = await Promise.all([
                supabase.from('properties').select('id', { count: 'exact', head: true }).eq('user_id', userId),
                supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('user_id', userId)
            ]);

            if ((props.count || 0) > 0 && (contracts.count || 0) === 0) {
                items.push({
                    id: 'onboarding-stalled',
                    type: 'action',
                    title: t('conciergeTitle'),
                    desc: t('conciergeDesc', { count: props.count || 0 }),
                    date: t('now'),
                    actionLabel: t('conciergeStart'),
                    metadata: { type: 'onboarding_stalled' }
                });
            }

        } catch (err) {
            console.error('Error fetching briefing items:', err);
        }

        // Fallback if no items
        if (items.length === 0) {
            items.push({
                id: 'welcome',
                type: 'success',
                title: t('welcomeMessage'),
                desc: t('allLooksQuiet'),
                date: t('now')
            });
        }

        // Sort by priority/date? 
        // For now, urgency is top.
        return items.sort((a, b) => {
            const priority = { urgent: 0, warning: 1, action: 2, info: 3, success: 4 };
            return (priority[a.type] - priority[b.type]);
        });
    }
};
