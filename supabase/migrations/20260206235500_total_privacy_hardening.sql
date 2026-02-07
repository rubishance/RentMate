-- Migration: Security Fortress (Total Privacy Hardening - v3)
-- Description: Enforces strict RLS ownership with Admin audit support (Zero-Exposure to other users).

BEGIN;

-- 1. HARDEN FEEDBACK TABLE
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'feedback') THEN
        ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can view own feedback" ON public.feedback;
        CREATE POLICY "Users can view own feedback" ON public.feedback
            FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
        -- Anyone can still insert (even guests) per current business logic if user_id is null
        -- but if user_id is set, it becomes owned.
    END IF;
END $$;

-- 2. HARDEN AI CONVERSATIONS
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ai_conversations') THEN
        ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can manage their own conversations" ON public.ai_conversations;
        DROP POLICY IF EXISTS "Users can view own AI conversations" ON public.ai_conversations;
        CREATE POLICY "Users can view own AI conversations" ON public.ai_conversations
            FOR ALL USING (auth.uid() = user_id OR public.is_admin());
    END IF;
END $$;

-- 3. HARDEN INVOICES
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoices') THEN
        ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;
        CREATE POLICY "Users can view own invoices" ON public.invoices
            FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
    END IF;
END $$;

-- 4. HARDEN USER PREFERENCES
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_preferences') THEN
        ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can manage own preferences" ON public.user_preferences;
        CREATE POLICY "Users can manage own preferences" ON public.user_preferences
            FOR ALL USING (auth.uid() = user_id OR public.is_admin());
    END IF;
END $$;

-- 5. HARDEN AUDIT LOGS (Admin ONLY)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
        ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
        CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
            FOR SELECT USING (public.is_admin());
    END IF;
END $$;

-- 6. HARDEN NOTIFICATIONS
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
        DROP POLICY IF EXISTS "Users can manage own notifications" ON public.notifications;
        CREATE POLICY "Users can manage own notifications" ON public.notifications
            FOR ALL USING (auth.uid() = user_id OR public.is_admin());
    END IF;
END $$;

-- 7. HARDEN STORAGE USAGE TRACKING
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_storage_usage') THEN
        ALTER TABLE public.user_storage_usage ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can view own storage usage" ON public.user_storage_usage;
        CREATE POLICY "Users can view own storage usage" ON public.user_storage_usage
            FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
    END IF;
END $$;

-- 8. HARDEN WHATSAPP CONVERSATIONS
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'whatsapp_conversations') THEN
        ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can view own whatsapp" ON public.whatsapp_conversations;
        CREATE POLICY "Users can view own whatsapp" ON public.whatsapp_conversations
            FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
    END IF;
END $$;

-- 9. HARDEN WHATSAPP MESSAGES
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'whatsapp_messages') THEN
        ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can view own whatsapp messages" ON public.whatsapp_messages;
        CREATE POLICY "Users can view own whatsapp messages" ON public.whatsapp_messages
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.whatsapp_conversations c
                    WHERE c.id = whatsapp_messages.conversation_id
                    AND (c.user_id = auth.uid() OR public.is_admin())
                )
            );
    END IF;
END $$;

-- 10. HARDEN USER PROFILES
-- Ensures users see their own profile, admins see ALL profiles.
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles') THEN
        ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
        CREATE POLICY "Users can view own profile" ON public.user_profiles
            FOR SELECT USING (auth.uid() = id OR public.is_admin());
            
        DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
        CREATE POLICY "Users can update own profile" ON public.user_profiles
            FOR UPDATE USING (auth.uid() = id)
            WITH CHECK (auth.uid() = id);
    END IF;
END $$;

COMMIT;
NOTIFY pgrst, 'reload schema';

COMMIT;
NOTIFY pgrst, 'reload schema';
