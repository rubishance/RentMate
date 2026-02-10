import { supabase } from '../lib/supabase';

export type AnalyticsEvent =
    | 'contract_scanned'
    | 'contract_created'
    | 'property_created'
    | 'payment_logged'
    | 'ai_message_generated'
    | 'calculator_used'
    | 'article_viewed'
    | 'plan_upgrade_viewed';

export function useUsageTracking() {
    const trackEvent = async (eventName: AnalyticsEvent, metadata: Record<string, any> = {}) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('analytics_events')
                .insert({
                    user_id: user.id,
                    event_name: eventName,
                    metadata: {
                        ...metadata,
                        url: window.location.pathname,
                        timestamp: new Date().toISOString()
                    }
                });

            if (error) {
                console.error('Error tracking event:', error);
            }
        } catch (err) {
            console.error('Unexpected error in trackEvent:', err);
        }
    };

    return { trackEvent };
}
