-- Harden SECURITY DEFINER functions with strict search_path
-- Migration: 20260120_harden_security_definer_functions.sql

-- 1. update_user_storage
ALTER FUNCTION public.update_user_storage() SET search_path = public;

-- 2. check_storage_quota
ALTER FUNCTION public.check_storage_quota(UUID, BIGINT, TEXT) SET search_path = public;

-- 3. process_daily_notifications
ALTER FUNCTION public.process_daily_notifications() SET search_path = public;

-- 4. Any other functions found in migrations that are SECURITY DEFINER but missing search_path
-- Searching for 'SECURITY DEFINER' in codebase often reveals these.
-- Note: delete_user_account and handle_new_user already have it.
