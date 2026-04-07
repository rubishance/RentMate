-- Up migration for adding performance tracking fields

ALTER TABLE public.security_audit_events 
ADD COLUMN IF NOT EXISTS duration_ms int4;

ALTER TABLE public.security_audit_events 
ALTER COLUMN user_id DROP NOT NULL;
