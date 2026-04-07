import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AnalyticsLogger } from "../_shared/logger.ts";
import { getCorsHeaders, handleCorsPreflight, validateOrigin } from '../_shared/cors.ts';
import { withEdgeMiddleware } from '../_shared/middleware.ts';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(withEdgeMiddleware('security-alerter', async (req, logger) => {
    logger.info("Security Alerter Cron Job invoked.");

    if (!RESEND_API_KEY || !ADMIN_EMAIL) {
        logger.error("Missing RESEND_API_KEY or ADMIN_EMAIL in environment.");
        return new Response(JSON.stringify({ error: "Missing Configuration" }), { status: 500 });
    }

    try {
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        // Execute query to find recent violations (Last 60 minutes)
        // Since we can't easily do ad-hoc GROUP BY > 10 via standard postgrest without an RPC, 
        // we will fetch all incidents in the last hour and calculate in memory (safe for small audits)
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase
            .from('security_audit_events')
            .select('user_id, ip_address, resource, event_type')
            .gte('timestamp', hourAgo);

        if (error) {
             throw new Error(`Failed querying audit DB: ${error.message}`);
        }

        if (!data || data.length === 0) {
            // Silent Mode - Early Exit
            logger.info("Silent Mode: No incidents logged in the last hour. Exiting cleanly.");
            return new Response(JSON.stringify({ message: "Silent Mode: No Incidents" }), { status: 200 });
        }

        // Group by user_id or resource and calculate anomalies
        const userViolations: Record<string, { count: number, resource: string, Types: Set<string> }> = {};
        const ipViolations: Record<string, { count: number, resource: string, Types: Set<string> }> = {};

        for (const event of data) {
            const byId = event.user_id || event.ip_address || "anonymous";
            if (!userViolations[byId]) userViolations[byId] = { count: 0, resource: event.resource, Types: new Set() };
            userViolations[byId].count++;
            userViolations[byId].Types.add(event.event_type);
        }

        // Filter those above threshold (10 blocks)
        const THRESHOLD = 10;
        const anomalies = Object.entries(userViolations).filter(([_, stats]) => stats.count >= THRESHOLD);

        if (anomalies.length === 0) {
            // Silent Mode - Early Exit
            logger.info(`Silent Mode: Events found but none exceed the threshold of ${THRESHOLD}. Exiting cleanly.`);
            return new Response(JSON.stringify({ message: "Silent Mode: Stable" }), { status: 200 });
        }

        logger.info(`Detected ${anomalies.length} anomalous bursts. Preparing alert email.`);

        // Prepare email HTML table
        let tableRows = "";
        anomalies.forEach(([id, stats]) => {
            tableRows += `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${id}</td>
              <td style="padding: 8px; border: 1px solid #ddd; color: red; font-weight: bold;">${stats.count}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${stats.resource}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${Array.from(stats.Types).join(", ")}</td>
            </tr>`;
        });

        const htmlEmail = `
        <div style="font-family: sans-serif; color: #333;">
            <h2 style="color: #e53e3e;">🚨 RentMate Security Alert</h2>
            <p>Automated security metrics have detected unusual rejection rates across your API gateways in the last 60 minutes.</p>
            <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
                <thead>
                    <tr style="background-color: #f7fafc; text-align: left;">
                        <th style="padding: 8px; border: 1px solid #ddd;">Actor (User/IP)</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">Blocks (1Hr)</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">Primary Resource</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">Event Types</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            <p style="font-size: 12px; color: #718096; margin-top: 20px;">This is an automated message triggered by edge function 'security-alerter'.</p>
        </div>`;

        // Dispatch via Resend API
        const emailReq = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'RentMate Security <security@rentmate-israel.com>',
                to: [ADMIN_EMAIL],
                subject: '🚨 URGENT: High API Block Rate Detected',
                html: htmlEmail
            })
        });

        if (!emailReq.ok) {
            const errBody = await emailReq.text();
            throw new Error(`Resend Email dispatch failed: ${errBody}`);
        }

        logger.info("Security Alert dispatched successfully via Resend.");
        return new Response(JSON.stringify({ success: true, alerted: anomalies.length }), { status: 200 });

    } catch (e: any) {
        throw e;

    }
}));
