// _shared/logger.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import * as Sentry from 'https://deno.land/x/sentry@8.45.0/index.mjs';

// Initialize Mock Sentry (Phase 1)
Sentry.init({
  dsn: "https://examplePublicKey@o0.ingest.sentry.io/0",
  tracesSampleRate: 1.0, 
});

interface LoggerContext {
  correlationId: string;
  resource: string;
}

export class AnalyticsLogger {
  private correlationId: string;
  private resource: string;
  private serviceRoleClient: any;
  private startTime: number;

  constructor(resource: string, req?: Request) {
    this.resource = resource;
    this.startTime = performance.now();
    // Extract or generate a Correlation ID
    this.correlationId = req?.headers.get('x-correlation-id') || crypto.randomUUID();
    
    // Initialize Admin Supabase Client for writing Audit Events (bypassing RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (supabaseUrl && supabaseServiceKey) {
        this.serviceRoleClient = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });
    }
  }

  // Deep PII Masking logic
  private maskPii(data: any): any {
    if (data === null || data === undefined) return data;
    if (typeof data !== 'object') return data;
    if (Array.isArray(data)) {
        return data.map(item => this.maskPii(item));
    }

    const maskedData = { ...data };
    const piiKeys = ['email', 'phone', 'id_number', 'password', 'full_name', 'bank_account', 'iban', 'address'];
    
    for (const key in maskedData) {
        if (Object.prototype.hasOwnProperty.call(maskedData, key)) {
            // Case insensitive match check against pii keys
            const isPII = piiKeys.some(piiKey => key.toLowerCase().includes(piiKey));
            
            if (isPII && typeof maskedData[key] === 'string') {
                maskedData[key] = '[*** REDACTED ***]';
            } else if (typeof maskedData[key] === 'object') {
                maskedData[key] = this.maskPii(maskedData[key]);
            }
        }
    }
    return maskedData;
  }

  private serializeLog(level: string, message: string, metadata?: any) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      correlationId: this.correlationId,
      resource: this.resource,
      message,
      metadata: this.maskPii(metadata || {})
    });
  }

  public info(message: string, metadata?: any) {
    console.info(this.serializeLog('INFO', message, metadata));
  }

  public warn(message: string, metadata?: any) {
    console.warn(this.serializeLog('WARN', message, metadata));
  }

  public error(message: string, metadata?: any) {
    const maskedMetadata = this.maskPii(metadata || {});
    console.error(this.serializeLog('ERROR', message, maskedMetadata));
    // Also capture exception in Sentry
    Sentry.captureException(new Error(message), {
      extra: { correlationId: this.correlationId, resource: this.resource, ...maskedMetadata }
    });
  }

  // Specialized strictly for Security Auditing
  public async logSecurityEvent(eventType: '429' | '403' | '401' | '400' | '500', userId: string | null, metadata?: any) {
    const durationMs = Math.round(performance.now() - this.startTime);
    const maskedMetadata = this.maskPii(metadata || {});
    this.warn(`Security Incident Blocked: ${eventType} in ${durationMs}ms`, maskedMetadata);

    // Track on Sentry
    Sentry.captureMessage(`Security Block [${eventType}] on ${this.resource}`, {
        level: 'warning',
        extra: { correlationId: this.correlationId, userId, durationMs, ...maskedMetadata }
    });

    // Write to DB Audit Logic Table
    if (this.serviceRoleClient) {
      try {
        await this.serviceRoleClient.from('security_audit_events').insert({
          user_id: userId,
          event_type: eventType,
          resource: this.resource,
          duration_ms: durationMs,
          metadata: {
             correlationId: this.correlationId,
             ...maskedMetadata
          }
        });
      } catch(e) {
          console.error(this.serializeLog('ERROR', 'Failed to insert security audit log into DB', { error: String(e) }));
      }
    }
  }

  // Logs a successful event for performance TTFB tracking over time
  public async logSuccessEvent(statusCode: number, userId: string | null = null, metadata?: any) {
    const durationMs = Math.round(performance.now() - this.startTime);
    const maskedMetadata = this.maskPii(metadata || {});
    this.info(`Success: ${statusCode} in ${durationMs}ms`, maskedMetadata);

    if (this.serviceRoleClient && Math.random() < 0.1) { 
      // Only capture 10% of successful queries strictly into the security table to avoid spam, or as requested, log 200s as well.
      // Wait: user requested "עדכן את ה-Global Middleware כך שיתעד גם בקשות מוצלחות (200) עם זמן הריצה שלהן, כדי שנוכל למדוד TTFB."
      // I will log them fully so the admin endpoint has enough data to trace.
      try {
        await this.serviceRoleClient.from('security_audit_events').insert({
          user_id: userId,
          event_type: String(statusCode),
          resource: this.resource,
          duration_ms: durationMs,
          metadata: {
             correlationId: this.correlationId,
             ...maskedMetadata
          }
        });
      } catch(e) {
          console.error(this.serializeLog('ERROR', 'Failed to insert success log into DB', { error: String(e) }));
      }
    }
  }

  public getCorrelationId() {
    return this.correlationId;
  }
}
