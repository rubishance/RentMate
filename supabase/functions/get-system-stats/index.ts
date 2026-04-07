// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { AnalyticsLogger } from '../_shared/logger.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { validateAdmin } from '../_shared/auth.ts';
import { withEdgeMiddleware } from '../_shared/middleware.ts';

const handler = async (req: Request, logger: AnalyticsLogger) => {
    // 1. Verify Admin Authorization
    const authResult = await validateAdmin(req);
    if (!authResult.success) {
        // Will be automatically mapped to Hebrew by withEdgeMiddleware if we just pass the error object
        return new Response(
            JSON.stringify({ error: authResult.error }), 
            { status: authResult.status, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 2. Fetch Data from security_audit_events
    const { data: events, error } = await supabase
        .from('security_audit_events')
        .select('*')
        .gte('timestamp', twentyFourHoursAgo);

    if (error) {
        throw new Error(`Database error: ${error.message}`);
    }

    // 3. Aggregate Data
    const blocksByType: Record<string, number> = {};
    const resourceRequests: Record<string, number> = {};
    let totalDuration = 0;
    let durationCount = 0;

    (events || []).forEach(evt => {
        // Event types starting with '40' or '429' or '50' are usually blocks/errors
        const type = parseInt(evt.event_type);
        if (type >= 400 || evt.event_type === '429' || evt.event_type === '403' || evt.event_type === '401') {
            blocksByType[evt.event_type] = (blocksByType[evt.event_type] || 0) + 1;
        }

        // Most requested resources
        resourceRequests[evt.resource] = (resourceRequests[evt.resource] || 0) + 1;

        // Average Response Time Calculation
        if (evt.duration_ms) {
            totalDuration += evt.duration_ms;
            durationCount += 1;
        }
    });

    // Formatting outputs
    const averageResponseTime = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;
    
    // Sort requested resources by count (descending)
    const sortedResources = Object.entries(resourceRequests)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([resource, count]) => ({ resource, count }));

    // Extract latest 10 incidents (errors/blocks)
    const recentIncidents = (events || [])
        .filter(evt => {
            const typeValue = parseInt(evt.event_type);
            return typeValue >= 400 || evt.event_type === '429';
        })
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10)
        .map(evt => {
            // Safely parse details if it's a string, or use directly if it's an object
            let parsedDetails = evt.details;
            if (typeof parsedDetails === 'string') {
                try {
                    parsedDetails = JSON.parse(parsedDetails);
                } catch (e) {
                    parsedDetails = {};
                }
            }

            return {
                id: evt.id,
                event_type: evt.event_type,
                resource: evt.resource,
                timestamp: evt.timestamp,
                user_id: evt.user_id,
                duration_ms: evt.duration_ms,
                error: parsedDetails?.error || 'Unknown Error',
                user_message: parsedDetails?.user_message || 'שגיאת מערכת כללית'
            };
        });

    return new Response(
        JSON.stringify({ 
            success: true, 
            data: {
                totalEvents24h: (events || []).length,
                blocksByType,
                averageResponseTimeMs: averageResponseTime,
                topRequestedEndpoints: sortedResources,
                recentIncidents
            }
        }),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
};

// Start the server wrapped securely with logging!
serve(withEdgeMiddleware('get-system-stats', handler));
