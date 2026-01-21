import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

const CHECK_KEY = 'rentmate_last_notification_check';

export function useNotificationScheduler() {
    useEffect(() => {
        const checkNotifications = async () => {
            try {
                // 1. Check local storage for last run
                const lastCheck = localStorage.getItem(CHECK_KEY);
                const now = new Date();

                if (lastCheck) {
                    const lastDate = new Date(lastCheck);
                    // Check if it's been less than 20 hours (approx daily)
                    const hoursDiff = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
                    if (hoursDiff < 20) {
                        return; // Already checked recently
                    }
                }

                // 2. Call the database function
                // Calls master orchestrator 'check_daily_notifications' which runs contract & rent checks
                const { error } = await supabase.rpc('check_daily_notifications');

                if (error) {
                    console.error('Failed to check automated notifications:', error);
                    // Don't update timestamp so it tries again next reload
                } else {
                    // 3. Update timestamp on success
                    localStorage.setItem(CHECK_KEY, now.toISOString());
                    console.log('Automated notification check completed');
                }

            } catch (err) {
                console.error('Error in notification scheduler:', err);
            }
        };

        // Run on mount
        checkNotifications();
    }, []);
}
