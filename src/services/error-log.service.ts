import { supabase } from '../lib/supabase';

export interface ErrorLogData {
    message: string;
    stack?: string;
    route?: string;
    componentStack?: string;
    metadata?: any;
    environment?: string;
}

class ErrorLogService {
    public async logError(error: Error, additionalData?: Partial<ErrorLogData>) {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const logData = {
                message: error.message || 'Unknown Error',
                stack: error.stack,
                route: window.location.pathname,
                user_id: user?.id || null,
                metadata: {
                    ...additionalData?.metadata,
                    url: window.location.href,
                    userAgent: navigator.userAgent,
                    timestamp: new Date().toISOString(),
                },
                component_stack: additionalData?.componentStack,
                environment: import.meta.env.MODE || 'production'
            };

            const { error: insertError } = await supabase
                .from('error_logs')
                .insert([logData]);

            if (insertError) {
                console.error('Failed to insert error log:', insertError);
                return { success: false, error: insertError };
            }

            return { success: true };
        } catch (err) {
            console.error('Error during error logging:', err);
            return { success: false, error: err };
        }
    }
}

export const errorLogService = new ErrorLogService();
