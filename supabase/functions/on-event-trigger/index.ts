// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        const payload = await req.json();
        const { type, table, record, old_record } = payload;

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase config missing.");
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        console.log(`Webhook Triggered: ${type} on ${table}`);

        // --- 1. NEW SUPPORT TICKET (NOT FROM EMAIL) ---
        if (table === 'support_tickets' && type === 'INSERT') {
            // If it's from email, metadata.from exists. 
            // If it's UI, we might need to send a confirmation to the logged-in user.
            const { data: user } = await supabase.from('user_profiles').select('email, full_name').eq('id', record.user_id).single();
            if (user?.email && !record.metadata?.from) {
                await supabase.functions.invoke('send-notification-email', {
                    body: {
                        email: user.email,
                        notification: {
                            title: 'פנייתך התקבלה [RentMate]',
                            message: `שלום ${user.full_name || ''}, קיבלנו את פנייתך בנושא "${record.title}". אנחנו בודקים את העניין ונחזור אליך בהקדם.`
                        }
                    }
                });
            }
        }

        // --- 2. PAYMENT SUCCESS ---
        if (table === 'payments' && type === 'UPDATE' && record.status === 'paid' && old_record.status !== 'paid') {
            const { data: user } = await supabase
                .from('contracts')
                .select('user_id, properties(address), user_profiles(email, full_name)')
                .eq('id', record.contract_id)
                .single();

            if (user?.user_profiles?.email) {
                await supabase.functions.invoke('send-notification-email', {
                    body: {
                        email: user.user_profiles.email,
                        notification: {
                            title: 'אישור תשלום [RentMate]',
                            message: `קיבלנו את הדיווח על תשלום בסך ${record.amount} ${record.currency} עבור הנכס ב${user.properties?.address}. הקבלה שמורה במערכת.`
                        }
                    }
                });
            }
        }

        // --- 3. CONTRACT CREATED ---
        if (table === 'contracts' && type === 'INSERT') {
            const { data: user } = await supabase.from('user_profiles').select('email, full_name').eq('id', record.user_id).single();
            const { data: property } = await supabase.from('properties').select('address').eq('id', record.property_id).single();

            if (user?.email) {
                await supabase.functions.invoke('send-notification-email', {
                    body: {
                        email: user.email,
                        notification: {
                            title: 'חוזה חדש הופעל [RentMate]',
                            message: `מזל טוב! החוזה עבור ${property?.address || 'הנכס'} הופעל בהצלחה במערכת. מעכשיו RentMate תנהל עבורך את ההתראות והצמדות המדד.`
                        }
                    }
                });
            }
        }

        // --- 4. PROFILE / SUBSCRIPTION UPDATED ---
        if (table === 'user_profiles' && type === 'UPDATE') {
            const lang = record.language || 'he';
            const isHe = lang === 'he';

            // Plan Changed
            if (record.plan_id !== old_record.plan_id) {
                await supabase.functions.invoke('send-notification-email', {
                    body: {
                        email: record.email,
                        lang: lang,
                        notification: {
                            title: isHe ? 'עדכון מנוי RentMate' : 'RentMate Subscription Updated',
                            message: isHe
                                ? `שלום ${record.full_name || ''}, המנוי שלך עודכן בהצלחה לתכנית חדשה. תודה שבחרת בנו!`
                                : `Hello ${record.full_name || ''}, your subscription has been successfully updated. Thank you for choosing us!`
                        }
                    }
                });
            }

            // Sensitive Info Changed (Email/Phone)
            if (record.email !== old_record.email || record.phone !== old_record.phone) {
                const field = record.email !== old_record.email
                    ? (isHe ? 'כתובת האימייל' : 'email address')
                    : (isHe ? 'מספר הטלפון' : 'phone number');

                const supportEmailSetting = await supabase.from('system_settings').select('value').eq('key', 'global_email_support').single();
                const supportEmail = supportEmailSetting.data?.value as string || 'support@rentmate.co.il';

                await supabase.functions.invoke('send-notification-email', {
                    body: {
                        email: record.email,
                        lang: lang,
                        notification: {
                            title: isHe ? 'עדכון פרטי חשבון' : 'Account Details Updated',
                            message: isHe
                                ? `שלום ${record.full_name || ''}, רצינו לעדכן שבוצע שינוי ב-${field} בחשבון ה-RentMate שלך. אם לא ביצעת את השינוי, פנה אלינו מיד ב-${supportEmail}.`
                                : `Hello ${record.full_name || ''}, we wanted to let you know that your ${field} was updated. If you didn't perform this action, contact us immediately at ${supportEmail}.`
                        }
                    }
                });
            }
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err) {
        console.error("Webhook Error:", err);
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
