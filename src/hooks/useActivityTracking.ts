import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useActivityTracking() {
    const location = useLocation();
    const { user } = useAuth();
    const lastPathRef = useRef<string | null>(null);

    useEffect(() => {
        const trackPageView = async () => {
            if (!user) return; // Don't track guests for now

            const currentPath = location.pathname;

            // Simple debounce/dedupe: don't track if path hasn't changed (though dependencies handle this mostly)
            if (currentPath === lastPathRef.current) return;
            lastPathRef.current = currentPath;

            try {
                await supabase.from('user_activity').insert({
                    user_id: user.id,
                    event_type: 'page_view',
                    path: currentPath,
                    metadata: {
                        search: location.search,
                        userAgent: navigator.userAgent
                    }
                });
            } catch (error) {
                // Silent fail to not disrupt user experience
                console.error('Error tracking activity:', error);
            }
        };

        const timeoutId = setTimeout(trackPageView, 1000); // 1s debounce to catch "settled" page views
        return () => clearTimeout(timeoutId);

    }, [location.pathname, location.search, user?.id]);
}
