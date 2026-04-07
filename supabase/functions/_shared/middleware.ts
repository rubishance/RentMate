// _shared/middleware.ts
import { AnalyticsLogger } from './logger.ts';
import { getCorsHeaders } from './cors.ts';
import { getFriendlyErrorMessage } from './error_messages.ts';

export function withEdgeMiddleware(resourceName: string, handler: (req: Request, logger: AnalyticsLogger) => Promise<Response>) {
    return async (req: Request): Promise<Response> => {
        // Initialize the logger which captures the startTime
        const logger = new AnalyticsLogger(resourceName, req);

        // Preflight OPTIONS handler can be ignored for logging usually
        if (req.method === 'OPTIONS') {
            return new Response('ok', { headers: getCorsHeaders(req) });
        }

        try {
            // Execute the main endpoint handler
            const response = await handler(req, logger);

            // If it returned a success Response, log it directly 
            // Note: We bypass parsing body for simplicity, since TTFB is what matters
            if (response.status >= 200 && response.status < 400) {
                await logger.logSuccessEvent(response.status);
            } 
            else if (response.status >= 400) {
                // If the handler returned an HTTP Error explicitly, we also want to intercept it and rewrite if user_message is missing!
                try {
                    const clonedRes = response.clone();
                    let payload = await clonedRes.json();
                    
                    if (!payload.user_message) {
                         payload.user_message = getFriendlyErrorMessage(response.status, payload.error || '');
                         
                         // Log the incident
                         await logger.logSecurityEvent(
                            response.status.toString() as '429' | '403' | '401' | '400' | '500', 
                            null, 
                            { error: payload.error }
                         );

                         return new Response(JSON.stringify(payload), { 
                            status: response.status, 
                            headers: getCorsHeaders(req) 
                         });
                    }
                } catch(e) {
                     // Response wasn't json, just log it
                     await logger.logSecurityEvent(
                        response.status.toString() as '429' | '403' | '401' | '400' | '500', 
                        null
                     );
                }
            }
            
            return response;

        } catch (error: any) {
             // Hard crash/throw caught by middleware
             logger.error('Unhandled Edge Function Exception', { error: error.message, stack: error.stack });
             
             await logger.logSecurityEvent('500', null, { error: error.message });
             
             return new Response(
                 JSON.stringify({ 
                     error: error.message || "Internal Server Error", 
                     user_message: getFriendlyErrorMessage(500, error.message) 
                 }),
                 { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
             );
        }
    };
}
