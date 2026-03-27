import { supabase } from '../lib/supabase';
import { differenceInDays, isPast, isToday, parseISO } from 'date-fns';

export class NotificationGeneratorService {
    /**
     * Runs checks to generate client-side notifications.
     * In a production environment with proper cron jobs, this logic would run on the backend.
     * This ensures the user sees alerts immediately upon opening the app.
     */
    static async runChecks() {
        try {
            // Check if we already ran this recently (within 1 hour)
            const lastCheckStr = sessionStorage.getItem('last_notification_check');
            if (lastCheckStr) {
                const lastCheck = parseISO(lastCheckStr);
                const hoursSinceLastCheck = Math.abs(new Date().getTime() - lastCheck.getTime()) / 36e5;
                if (hoursSinceLastCheck < 1) { 
                    return;
                }
            }
            // Lock it immediately to prevent race conditions during React StrictMode double mounts
            sessionStorage.setItem('last_notification_check', new Date().toISOString());

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch user preferences
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('notification_preferences, lang')
                .eq('id', user.id)
                .single();

            const prefs = (profile?.notification_preferences as any) || {};
            const lang = profile?.lang || 'he';

            const contractExpiryDays = prefs.contract_expiry_days ?? 60;
            const unpaidRentEnabled = prefs.unpaid_rent_enabled ?? true;
            // extension features could use: prefs.extension_option_days ?? 30, prefs.extension_option_end_days ?? 7

            // 2. Run Individual Checks
            await this.checkExpiringContracts(user.id, contractExpiryDays, lang);
            await this.checkRentDue(user.id, unpaidRentEnabled, lang);

        } catch (error) {
            sessionStorage.removeItem('last_notification_check'); // Remove lock if crash happens
            console.error('Error running notification checks:', error);
            console.error('Error running notification checks:', error);
        }
    }

    private static async checkExpiringContracts(userId: string, thresholdDays: number, lang: string) {
        if (thresholdDays <= 0) return; // Feature disabled by user

        const { data: contracts } = await supabase
            .from('contracts')
            .select('id, end_date, properties(address, city)')
            .eq('user_id', userId)
            .eq('status', 'active');

        if (!contracts) return;

        for (const contract of contracts) {
            if (!contract.end_date) continue;

            const endDate = parseISO(contract.end_date);
            const daysUntilExpiry = differenceInDays(endDate, new Date());

            if (daysUntilExpiry > 0 && daysUntilExpiry <= thresholdDays) {
                // Supabase returns related records as objects or arrays of objects.
                const property = Array.isArray(contract.properties) ? contract.properties[0] : contract.properties;
                const address = property?.address || 'הנכס';
                const city = property?.city ? `, ${property.city}` : '';
                const fullAddress = `${address}${city}`;

                const title = lang === 'en' ? 'Contract Expiring Soon' : 'חוזה עומד להסתיים';
                const message = lang === 'en'
                    ? `The contract at ${fullAddress} expires in ${daysUntilExpiry} days.`
                    : `החוזה בכתובת ${fullAddress} יסתיים בעוד ${daysUntilExpiry} ימים.`;

                await this.createNotificationIfNotExists(userId, 'contract_expiry_alert', contract.id, {
                    type: 'warning',
                    title,
                    message,
                    metadata: { contract_id: contract.id, event: 'contract_expiry_alert' }
                });
            }
        }
    }

    private static async checkRentDue(userId: string, unpaidRentEnabled: boolean, lang: string) {
        // Find pending payments
        const { data: payments } = await supabase
            .from('payments')
            .select('id, amount, due_date, currency, contract_id, contracts(properties(address, city))')
            .eq('user_id', userId)
            .in('status', ['pending', 'overdue']);

        if (!payments) return;

        for (const payment of payments) {
            if (!payment.due_date) continue;

            const dueDate = parseISO(payment.due_date);
            const isOverdue = isPast(dueDate) && !isToday(dueDate);
            const daysUntilDue = differenceInDays(dueDate, new Date());

            const formattedAmount = new Intl.NumberFormat('he-IL', { style: 'currency', currency: payment.currency || 'ILS' }).format(payment.amount);

            // Handle array or object from Supabase join
            const contractObj = Array.isArray(payment.contracts) ? payment.contracts[0] : payment.contracts;
            const propertyObj = contractObj?.properties;
            const propertyInstance = Array.isArray(propertyObj) ? propertyObj[0] : propertyObj;
            const address = propertyInstance?.address || 'הנכס';
            const city = propertyInstance?.city ? `, ${propertyInstance.city}` : '';
            const propertyAddress = `${address}${city}`;

            if (isOverdue && unpaidRentEnabled) {
                const daysOverdue = Math.abs(daysUntilDue);
                const title = lang === 'en' ? 'Unpaid Rent Notification' : 'שכר דירה שלא שולם';
                const message = lang === 'en'
                    ? `The payment of ${formattedAmount} for ${propertyAddress} is ${daysOverdue} days unpaid.`
                    : `התשלום על סך ${formattedAmount} עבור ${propertyAddress} נמצא בפיגור של ${daysOverdue} ימים.`;

                // Distinct key for overdue so it generates newly compared to just "upcoming"
                await this.createNotificationIfNotExists(userId, 'payment_overdue_alert', payment.id, {
                    type: 'error',
                    title,
                    message,
                    metadata: { payment_id: payment.id, contract_id: payment.contract_id, event: 'payment_overdue_alert' }
                });
            }
        }
    }

    /**
     * Checks if we already generated a similar notification recently to avoid duplicates.
     */
    private static async createNotificationIfNotExists(
        userId: string,
        eventType: string,
        entityId: string,
        payload: { type: string, title: string, message: string, metadata: any }
    ) {
        // Query previous notifications to check for duplicates (ever) based on metadata event and entity
        const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .contains('metadata', { event: eventType })
            // For contract/payment ID linkage:
            .contains('metadata', payload.metadata.payment_id ? { payment_id: entityId } : { contract_id: entityId });

        if (count && count > 0) {
            // Already notified
            return;
        }

        // Generate the notification
        await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                type: payload.type,
                title: payload.title,
                message: payload.message,
                metadata: payload.metadata,
                created_at: new Date().toISOString()
            });
    }
}
