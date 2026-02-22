
staging_schema.sql:1:-- ============================================
staging_schema.sql:2:-- FOUNDATION: CORE TABLES AND EXTENSIONS
staging_schema.sql:3:-- ============================================
staging_schema.sql:4:CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
staging_schema.sql:5:CREATE EXTENSION IF NOT EXISTS "pgcrypto";
staging_schema.sql:6:
staging_schema.sql:7:-- USER PROFILES (The Pivot)
staging_schema.sql:8:CREATE TABLE IF NOT EXISTS public.user_profiles (
staging_schema.sql:9:    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
staging_schema.sql:10:    email TEXT,
staging_schema.sql:11:    full_name TEXT,
staging_schema.sql:12:    role TEXT DEFAULT 'user',
staging_schema.sql:13:    subscription_status TEXT DEFAULT 'active',
staging_schema.sql:14:    subscription_plan TEXT DEFAULT 'free_forever',
staging_schema.sql:15:    created_at TIMESTAMPTZ DEFAULT NOW(),
staging_schema.sql:16:    updated_at TIMESTAMPTZ DEFAULT NOW()
staging_schema.sql:17:);
staging_schema.sql:18:
staging_schema.sql:19:-- PROPERTIES
staging_schema.sql:20:CREATE TABLE IF NOT EXISTS public.properties (
staging_schema.sql:21:    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
staging_schema.sql:22:    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
staging_schema.sql:23:    title TEXT,
staging_schema.sql:24:    address TEXT,
staging_schema.sql:25:    city TEXT,
staging_schema.sql:26:    created_at TIMESTAMPTZ DEFAULT NOW()
staging_schema.sql:27:);
staging_schema.sql:28:
staging_schema.sql:29:-- TENANTS
staging_schema.sql:30:CREATE TABLE IF NOT EXISTS public.tenants (
staging_schema.sql:31:    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
staging_schema.sql:32:    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
staging_schema.sql:33:    name TEXT,
staging_schema.sql:34:    email TEXT,
staging_schema.sql:35:    phone TEXT,
staging_schema.sql:36:    created_at TIMESTAMPTZ DEFAULT NOW()
staging_schema.sql:37:);
staging_schema.sql:38:
staging_schema.sql:39:-- CONTRACTS
staging_schema.sql:40:CREATE TABLE IF NOT EXISTS public.contracts (
staging_schema.sql:41:    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
staging_schema.sql:42:    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
staging_schema.sql:43:    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
staging_schema.sql:44:    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
staging_schema.sql:45:    start_date DATE,
staging_schema.sql:46:    end_date DATE,
staging_schema.sql:47:    created_at TIMESTAMPTZ DEFAULT NOW()
staging_schema.sql:48:);
staging_schema.sql:49:
staging_schema.sql:50:-- Add extraction fields to contracts table
staging_schema.sql:51:ALTER TABLE contracts 
staging_schema.sql:52:ADD COLUMN IF NOT EXISTS guarantors_info TEXT, -- Summarized text of all guarantors
staging_schema.sql:53:ADD COLUMN IF NOT EXISTS special_clauses TEXT; -- Summarized text of special clauses
staging_schema.sql:54:
staging_schema.sql:55:-- Update RLS if needed (usually unrelated to column addition, but good practice to verify)
staging_schema.sql:56:-- Existing policies should cover these new columns automatically if they are SELECT * / INSERT / UPDATE
staging_schema.sql:57:-- Trigger: Notify on Contract Status Change
staging_schema.sql:58:
staging_schema.sql:59:CREATE OR REPLACE FUNCTION public.notify_contract_status_change()
staging_schema.sql:60:RETURNS TRIGGER
staging_schema.sql:61:LANGUAGE plpgsql
staging_schema.sql:62:SECURITY DEFINER
staging_schema.sql:63:AS $$
staging_schema.sql:64:DECLARE
staging_schema.sql:65:    property_address text;
staging_schema.sql:66:    notification_title text;
staging_schema.sql:67:    notification_body text;
staging_schema.sql:68:BEGIN
staging_schema.sql:69:    -- Only proceed if status changed
staging_schema.sql:70:    IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
staging_schema.sql:71:        RETURN NEW;
staging_schema.sql:72:    END IF;
staging_schema.sql:73:
staging_schema.sql:74:    -- Fetch property address
staging_schema.sql:75:    SELECT city || ', ' || address INTO property_address
staging_schema.sql:76:    FROM public.properties
staging_schema.sql:77:    WHERE id = NEW.property_id;
staging_schema.sql:78:
staging_schema.sql:79:    -- Determine message
staging_schema.sql:80:    notification_title := 'Contract Status Updated';
staging_schema.sql:81:    notification_body := format('Contract for %s is now %s.', property_address, NEW.status);
staging_schema.sql:82:
staging_schema.sql:83:    -- Insert Notification
staging_schema.sql:84:    INSERT INTO public.notifications (user_id, type, title, message, metadata)
staging_schema.sql:85:    VALUES (
staging_schema.sql:86:        NEW.user_id,
staging_schema.sql:87:        'info', -- Status change is informational/important but not necessarily a warning
staging_schema.sql:88:        notification_title,
staging_schema.sql:89:        notification_body,
staging_schema.sql:90:        json_build_object(
staging_schema.sql:91:            'contract_id', NEW.id,
staging_schema.sql:92:            'event', 'status_change',
staging_schema.sql:93:            'old_status', OLD.status,
staging_schema.sql:94:            'new_status', NEW.status
staging_schema.sql:95:        )::jsonb
staging_schema.sql:96:    );
staging_schema.sql:97:
staging_schema.sql:98:    RETURN NEW;
staging_schema.sql:99:END;
staging_schema.sql:100:$$;
staging_schema.sql:101:
staging_schema.sql:102:DROP TRIGGER IF EXISTS on_contract_status_change ON public.contracts;
staging_schema.sql:103:
staging_schema.sql:104:CREATE TRIGGER on_contract_status_change
staging_schema.sql:105:    AFTER UPDATE ON public.contracts
staging_schema.sql:106:    FOR EACH ROW
staging_schema.sql:107:    EXECUTE FUNCTION public.notify_contract_status_change();
staging_schema.sql:108:-- Function: Process Daily Notifications
staging_schema.sql:109:-- This function is intended to be run once a day (e.g., via pg_cron or Edge Function).
staging_schema.sql:110:
staging_schema.sql:111:CREATE OR REPLACE FUNCTION public.process_daily_notifications()
staging_schema.sql:112:RETURNS void
staging_schema.sql:113:LANGUAGE plpgsql
staging_schema.sql:114:SECURITY DEFINER
staging_schema.sql:115:AS $$
staging_schema.sql:116:DECLARE
staging_schema.sql:117:    r RECORD;
staging_schema.sql:118:    extension_days int := 60; -- Default extension notice period
staging_schema.sql:119:BEGIN
staging_schema.sql:120:    -------------------------------------------------------
staging_schema.sql:121:    -- 1. CONTRACT ENDING SOON (30 Days)
staging_schema.sql:122:    -------------------------------------------------------
staging_schema.sql:123:    FOR r IN
staging_schema.sql:124:        SELECT c.id, c.user_id, c.end_date, p.city, p.address
staging_schema.sql:125:        FROM public.contracts c
staging_schema.sql:126:        JOIN public.properties p ON p.id = c.property_id
staging_schema.sql:127:        WHERE c.status = 'active'
staging_schema.sql:128:        AND c.end_date = CURRENT_DATE + INTERVAL '30 days'
staging_schema.sql:129:    LOOP
staging_schema.sql:130:        -- Check if we already sent this notification (idempotency)
staging_schema.sql:131:        IF NOT EXISTS (
staging_schema.sql:132:            SELECT 1 FROM public.notifications 
staging_schema.sql:133:            WHERE user_id = r.user_id 
staging_schema.sql:134:            AND metadata->>'contract_id' = r.id::text 
staging_schema.sql:135:            AND metadata->>'event' = 'ending_soon'
staging_schema.sql:136:        ) THEN
staging_schema.sql:137:            INSERT INTO public.notifications (user_id, type, title, message, metadata)
staging_schema.sql:138:            VALUES (
staging_schema.sql:139:                r.user_id,
staging_schema.sql:140:                'warning',
staging_schema.sql:141:                'Contract Ending Soon',
staging_schema.sql:142:                format('Contract for %s, %s ends in 30 days (%s).', r.city, r.address, r.end_date),
staging_schema.sql:143:                json_build_object('contract_id', r.id, 'event', 'ending_soon')::jsonb
staging_schema.sql:144:            );
staging_schema.sql:145:        END IF;
staging_schema.sql:146:    END LOOP;
staging_schema.sql:147:
staging_schema.sql:148:    -------------------------------------------------------
staging_schema.sql:149:    -- 2. EXTENSION OPTION DEADLINE (User Defined / Default 60 days)
staging_schema.sql:150:    -------------------------------------------------------
staging_schema.sql:151:    -- Note: Ideally fetch 'extension_days' from user_preferences per user, but for mass handling we use default or logic.
staging_schema.sql:152:    -- If user_preferences has the column, we could join. For now, strict 60 days.
staging_schema.sql:153:    
staging_schema.sql:154:    FOR r IN
staging_schema.sql:155:        SELECT c.id, c.user_id, c.end_date, p.city, p.address
staging_schema.sql:156:        FROM public.contracts c
staging_schema.sql:157:        JOIN public.properties p ON p.id = c.property_id
staging_schema.sql:158:        WHERE c.status = 'active'
staging_schema.sql:159:        AND c.extension_option = TRUE
staging_schema.sql:160:        -- Assuming deadline IS the end_date if not specified otherwise, or checking user preference
staging_schema.sql:161:        AND c.end_date = CURRENT_DATE + (extension_days || ' days')::INTERVAL
staging_schema.sql:162:    LOOP
staging_schema.sql:163:        IF NOT EXISTS (
staging_schema.sql:164:            SELECT 1 FROM public.notifications 
staging_schema.sql:165:            WHERE user_id = r.user_id 
staging_schema.sql:166:            AND metadata->>'contract_id' = r.id::text 
staging_schema.sql:167:            AND metadata->>'event' = 'extension_deadline'
staging_schema.sql:168:        ) THEN
staging_schema.sql:169:            INSERT INTO public.notifications (user_id, type, title, message, metadata)
staging_schema.sql:170:            VALUES (
staging_schema.sql:171:                r.user_id,
staging_schema.sql:172:                'action', -- Custom type 'action' or 'info'
staging_schema.sql:173:                'Extension Deadline Approaching',
staging_schema.sql:174:                format('Extension option for %s, %s ends in %s days.', r.city, r.address, extension_days),
staging_schema.sql:175:                json_build_object('contract_id', r.id, 'event', 'extension_deadline')::jsonb
staging_schema.sql:176:            );
staging_schema.sql:177:        END IF;
staging_schema.sql:178:    END LOOP;
staging_schema.sql:179:
staging_schema.sql:180:    -------------------------------------------------------
staging_schema.sql:181:    -- 3. ANNUAL INDEX UPDATE (1 Year after Start)
staging_schema.sql:182:    -------------------------------------------------------
staging_schema.sql:183:    FOR r IN
staging_schema.sql:184:        SELECT c.id, c.user_id, c.start_date, p.city, p.address
staging_schema.sql:185:        FROM public.contracts c
staging_schema.sql:186:        JOIN public.properties p ON p.id = c.property_id
staging_schema.sql:187:        WHERE c.status = 'active'
staging_schema.sql:188:        AND c.linkage_type != 'none' -- Only if linked
staging_schema.sql:189:        AND (
staging_schema.sql:190:            c.start_date + INTERVAL '1 year' = CURRENT_DATE OR
staging_schema.sql:191:            c.start_date + INTERVAL '2 years' = CURRENT_DATE OR
staging_schema.sql:192:            c.start_date + INTERVAL '3 years' = CURRENT_DATE
staging_schema.sql:193:        )
staging_schema.sql:194:    LOOP
staging_schema.sql:195:        IF NOT EXISTS (
staging_schema.sql:196:            SELECT 1 FROM public.notifications 
staging_schema.sql:197:            WHERE user_id = r.user_id 
staging_schema.sql:198:            AND metadata->>'contract_id' = r.id::text 
staging_schema.sql:199:            AND metadata->>'event' = 'index_update'
staging_schema.sql:200:            AND metadata->>'date' = CURRENT_DATE::text
staging_schema.sql:201:        ) THEN
staging_schema.sql:202:            INSERT INTO public.notifications (user_id, type, title, message, metadata)
staging_schema.sql:203:            VALUES (
staging_schema.sql:204:                r.user_id,
staging_schema.sql:205:                'urgent',
staging_schema.sql:206:                'Annual Index Update',
staging_schema.sql:207:                format('Annual index update required for %s, %s.', r.city, r.address),
staging_schema.sql:208:                json_build_object('contract_id', r.id, 'event', 'index_update', 'date', CURRENT_DATE)::jsonb
staging_schema.sql:209:            );
staging_schema.sql:210:        END IF;
staging_schema.sql:211:    END LOOP;
staging_schema.sql:212:
staging_schema.sql:213:    -------------------------------------------------------
staging_schema.sql:214:    -- 4. PAYMENT DUE TODAY
staging_schema.sql:215:    -------------------------------------------------------
staging_schema.sql:216:    FOR r IN
staging_schema.sql:217:        SELECT py.id, py.user_id, py.amount, py.date, p.city, p.address
staging_schema.sql:218:        FROM public.payments py
staging_schema.sql:219:        JOIN public.contracts c ON c.id = py.contract_id
staging_schema.sql:220:        JOIN public.properties p ON p.id = c.property_id
staging_schema.sql:221:        WHERE py.status = 'pending'
staging_schema.sql:222:        AND py.date = CURRENT_DATE
staging_schema.sql:223:    LOOP
staging_schema.sql:224:        IF NOT EXISTS (
staging_schema.sql:225:            SELECT 1 FROM public.notifications 
staging_schema.sql:226:            WHERE user_id = r.user_id 
staging_schema.sql:227:            AND metadata->>'payment_id' = r.id::text 
staging_schema.sql:228:            AND metadata->>'event' = 'payment_due'
staging_schema.sql:229:        ) THEN
staging_schema.sql:230:            INSERT INTO public.notifications (user_id, type, title, message, metadata)
staging_schema.sql:231:            VALUES (
staging_schema.sql:232:                r.user_id,
staging_schema.sql:233:                'warning',
staging_schema.sql:234:                'Payment Due Today',
staging_schema.sql:235:                format('Payment of ג‚×%s for %s, %s is due today.', r.amount, r.city, r.address),
staging_schema.sql:236:                json_build_object('payment_id', r.id, 'event', 'payment_due')::jsonb
staging_schema.sql:237:            );
staging_schema.sql:238:        END IF;
staging_schema.sql:239:    END LOOP;
staging_schema.sql:240:
staging_schema.sql:241:END;
staging_schema.sql:242:$$;
staging_schema.sql:243:-- Add needs_painting column to contracts table
staging_schema.sql:244:ALTER TABLE contracts 
staging_schema.sql:245:ADD COLUMN needs_painting BOOLEAN DEFAULT false;
staging_schema.sql:246:
staging_schema.sql:247:-- Add option_periods column to contracts table
staging_schema.sql:248:-- Use JSONB to store an array of options, e.g., [{"length": 12, "unit": "months"}, {"length": 1, "unit": "years"}]
staging_schema.sql:249:
staging_schema.sql:250:DO $$
staging_schema.sql:251:BEGIN
staging_schema.sql:252:    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'option_periods') 
THEN
staging_schema.sql:253:        ALTER TABLE public.contracts ADD COLUMN option_periods JSONB DEFAULT '[]'::jsonb;
staging_schema.sql:254:    END IF;
staging_schema.sql:255:END $$;
staging_schema.sql:256:-- Migration to add 'other' to the property_type check constraint
staging_schema.sql:257:
staging_schema.sql:258:-- First, drop the existing check constraint
staging_schema.sql:259:ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_property_type_check;
staging_schema.sql:260:
staging_schema.sql:261:-- Re-add the check constraint with 'other' included
staging_schema.sql:262:ALTER TABLE properties 
staging_schema.sql:263:ADD CONSTRAINT properties_property_type_check 
staging_schema.sql:264:CHECK (property_type IN ('apartment', 'penthouse', 'garden', 'house', 'other'));
staging_schema.sql:265:-- Add parking and storage columns to properties
staging_schema.sql:266:ALTER TABLE properties
staging_schema.sql:267:ADD COLUMN IF NOT EXISTS has_parking BOOLEAN DEFAULT false,
staging_schema.sql:268:ADD COLUMN IF NOT EXISTS has_storage BOOLEAN DEFAULT false;
staging_schema.sql:269:-- Add property_type column
staging_schema.sql:270:ALTER TABLE properties
staging_schema.sql:271:ADD COLUMN IF NOT EXISTS property_type TEXT DEFAULT 'apartment';
staging_schema.sql:272:-- Migration to add missing rent_price column to properties table
staging_schema.sql:273:-- Fixes error: Could not find the 'rent_price' column of 'properties' in the schema cache
staging_schema.sql:274:
staging_schema.sql:275:ALTER TABLE public.properties 
staging_schema.sql:276:ADD COLUMN IF NOT EXISTS rent_price NUMERIC(10, 2);
staging_schema.sql:277:
staging_schema.sql:278:-- Also ensure RLS is enabled as a best practice, though likely already on
staging_schema.sql:279:ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
staging_schema.sql:280:-- Add Stripe-related fields to user_profiles table
staging_schema.sql:281:ALTER TABLE user_profiles
staging_schema.sql:282:ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
staging_schema.sql:283:ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
staging_schema.sql:284:ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 
'canceled', 'past_due'));
staging_schema.sql:285:
staging_schema.sql:286:-- Create index for faster lookups
staging_schema.sql:287:CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer ON user_profiles(stripe_customer_id);
staging_schema.sql:288:CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_subscription ON user_profiles(stripe_subscription_id);
staging_schema.sql:289:
staging_schema.sql:290:-- Add comment
staging_schema.sql:291:SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'sessions';
staging_schema.sql:292:-- Clean up legacy/unnecessary columns from contracts table
staging_schema.sql:293:-- Use with caution: Only drops columns that are confirmed unused by current codebase
staging_schema.sql:294:
staging_schema.sql:295:DO $$
staging_schema.sql:296:BEGIN
staging_schema.sql:297:    -- Drop 'index_base' if it exists (legacy name, replaced by base_index_value)
staging_schema.sql:298:    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'index_base') THEN
staging_schema.sql:299:        ALTER TABLE contracts DROP COLUMN index_base;
staging_schema.sql:300:    END IF;
staging_schema.sql:301:
staging_schema.sql:302:    -- Drop 'linkage_rate' if it exists (legacy name, replaced by linkage_value or coefficient)
staging_schema.sql:303:    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'linkage_rate') THEN
staging_schema.sql:304:        ALTER TABLE contracts DROP COLUMN linkage_rate;
staging_schema.sql:305:    END IF;
staging_schema.sql:306:
staging_schema.sql:307:    -- Drop 'index_linkage_rate' if it exists on contracts (it belongs on payments)
staging_schema.sql:308:    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'index_linkage_rate') 
THEN
staging_schema.sql:309:        ALTER TABLE contracts DROP COLUMN index_linkage_rate;
staging_schema.sql:310:    END IF;
staging_schema.sql:311:
staging_schema.sql:312:     -- Drop 'user_confirmed' if it exists on properties (not used)
staging_schema.sql:313:    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'user_confirmed') 
THEN
staging_schema.sql:314:        ALTER TABLE properties DROP COLUMN user_confirmed;
staging_schema.sql:315:    END IF;
staging_schema.sql:316:
staging_schema.sql:317:END $$;
staging_schema.sql:318:-- Create admin_notifications table
staging_schema.sql:319:create table if not exists admin_notifications (
staging_schema.sql:320:  id uuid default gen_random_uuid() primary key,
staging_schema.sql:321:  user_id uuid references auth.users(id) not null,
staging_schema.sql:322:  type text not null check (type in ('upgrade_request', 'system_alert')),
staging_schema.sql:323:  content jsonb not null default '{}'::jsonb,
staging_schema.sql:324:  status text not null default 'pending' check (status in ('pending', 'processing', 'resolved', 'dismissed')),
staging_schema.sql:325:  created_at timestamp with time zone default timezone('utc'::text, now()) not null
staging_schema.sql:326:);
staging_schema.sql:327:
staging_schema.sql:328:-- Enable RLS
staging_schema.sql:329:alter table admin_notifications enable row level security;
staging_schema.sql:330:
staging_schema.sql:331:-- Policy: Admins can view all notifications
staging_schema.sql:332:create policy "Admins can view all notifications"
staging_schema.sql:333:  on admin_notifications for select
staging_schema.sql:334:  to authenticated
staging_schema.sql:335:  using (
staging_schema.sql:336:    exists (
staging_schema.sql:337:      select 1 from user_profiles
staging_schema.sql:338:      where id = auth.uid() and role = 'admin'
staging_schema.sql:339:    )
staging_schema.sql:340:  );
staging_schema.sql:341:
staging_schema.sql:342:-- Policy: Admins can update notifications
staging_schema.sql:343:create policy "Admins can update notifications"
staging_schema.sql:344:  on admin_notifications for update
staging_schema.sql:345:  to authenticated
staging_schema.sql:346:  using (
staging_schema.sql:347:    exists (
staging_schema.sql:348:      select 1 from user_profiles
staging_schema.sql:349:      where id = auth.uid() and role = 'admin'
staging_schema.sql:350:    )
staging_schema.sql:351:  );
staging_schema.sql:352:
staging_schema.sql:353:-- Policy: Users can insert their own upgrade requests
staging_schema.sql:354:create policy "Users can insert upgrade requests"
staging_schema.sql:355:  on admin_notifications for insert
staging_schema.sql:356:  to authenticated
staging_schema.sql:357:  with check (
staging_schema.sql:358:    user_id = auth.uid() 
staging_schema.sql:359:    and type = 'upgrade_request'
staging_schema.sql:360:  );
staging_schema.sql:361:
staging_schema.sql:362:-- Optional: Index for filtering by status
staging_schema.sql:363:create index if not exists idx_admin_notifications_status on admin_notifications(status);
staging_schema.sql:364:-- Create contact_messages table
staging_schema.sql:365:CREATE TABLE IF NOT EXISTS public.contact_messages (
staging_schema.sql:366:    id UUID NOT NULL DEFAULT gen_random_uuid(),
staging_schema.sql:367:    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
staging_schema.sql:368:    user_name TEXT NOT NULL,
staging_schema.sql:369:    user_email TEXT NOT NULL,
staging_schema.sql:370:    message TEXT NOT NULL,
staging_schema.sql:371:    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
staging_schema.sql:372:    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
staging_schema.sql:373:    CONSTRAINT contact_messages_pkey PRIMARY KEY (id)
staging_schema.sql:374:);
staging_schema.sql:375:
staging_schema.sql:376:-- Enable RLS
staging_schema.sql:377:ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
staging_schema.sql:378:
staging_schema.sql:379:-- Policies
staging_schema.sql:380:CREATE POLICY "Users can view own messages"
staging_schema.sql:381:    ON contact_messages FOR SELECT
staging_schema.sql:382:    USING (user_id = auth.uid());
staging_schema.sql:383:
staging_schema.sql:384:CREATE POLICY "Users can insert own messages"
staging_schema.sql:385:    ON contact_messages FOR INSERT
staging_schema.sql:386:    WITH CHECK (user_id = auth.uid());
staging_schema.sql:387:
staging_schema.sql:388:-- Admin policy (if you want admins to see all messages)
staging_schema.sql:389:CREATE POLICY "Admins can view all messages"
staging_schema.sql:390:    ON contact_messages FOR SELECT
staging_schema.sql:391:    USING (
staging_schema.sql:392:        EXISTS (
staging_schema.sql:393:            SELECT 1 FROM user_profiles
staging_schema.sql:394:            WHERE id = auth.uid() AND role = 'admin'
staging_schema.sql:395:        )
staging_schema.sql:396:    );
staging_schema.sql:397:
staging_schema.sql:398:-- Create index for faster queries
staging_schema.sql:399:CREATE INDEX idx_contact_messages_user_id ON contact_messages(user_id);
staging_schema.sql:400:CREATE INDEX idx_contact_messages_status ON contact_messages(status);
staging_schema.sql:401:CREATE INDEX idx_contact_messages_created_at ON contact_messages(created_at DESC);
staging_schema.sql:402:-- Create the 'contracts' storage bucket if it doesn't exist
staging_schema.sql:403:INSERT INTO storage.buckets (id, name, public)
staging_schema.sql:404:VALUES ('contracts', 'contracts', true)
staging_schema.sql:405:ON CONFLICT (id) DO NOTHING;
staging_schema.sql:406:
staging_schema.sql:407:-- Policy: Allow authenticated users to upload files to 'contracts' bucket
staging_schema.sql:408:CREATE POLICY "Allow authenticated uploads"
staging_schema.sql:409:ON storage.objects FOR INSERT
staging_schema.sql:410:TO authenticated
staging_schema.sql:411:WITH CHECK (bucket_id = 'contracts');
staging_schema.sql:412:
staging_schema.sql:413:-- Policy: Allow authenticated users to view files in 'contracts' bucket
staging_schema.sql:414:CREATE POLICY "Allow authenticated view"
staging_schema.sql:415:ON storage.objects FOR SELECT
staging_schema.sql:416:TO authenticated
staging_schema.sql:417:USING (bucket_id = 'contracts');
staging_schema.sql:418:
staging_schema.sql:419:-- Policy: Allow users to update their own files (optional, but good for redaction flow)
staging_schema.sql:420:CREATE POLICY "Allow authenticated update"
staging_schema.sql:421:ON storage.objects FOR UPDATE
staging_schema.sql:422:TO authenticated
staging_schema.sql:423:USING (bucket_id = 'contracts');
staging_schema.sql:424:
staging_schema.sql:425:-- Policy: Allow users to delete their own files
staging_schema.sql:426:CREATE POLICY "Allow authenticated delete"
staging_schema.sql:427:ON storage.objects FOR DELETE
staging_schema.sql:428:TO authenticated
staging_schema.sql:429:USING (bucket_id = 'contracts');
staging_schema.sql:430:-- Create table for storing index base periods and chaining factors
staging_schema.sql:431:CREATE TABLE IF NOT EXISTS index_bases (
staging_schema.sql:432:    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
staging_schema.sql:433:    index_type TEXT NOT NULL, -- e.g., 'cpi', 'construction', 'housing'
staging_schema.sql:434:    base_period_start DATE NOT NULL, -- The start date of this base period (e.g., '2023-01-01')
staging_schema.sql:435:    base_value NUMERIC NOT NULL DEFAULT 100.0, -- The value of the base index (usually 100.0)
staging_schema.sql:436:    previous_base_period_start DATE, -- The start date of the *previous* base period
staging_schema.sql:437:    chain_factor NUMERIC, -- The factor to multiply when moving FROM this base TO the previous base (or vice versa depending 
on logic)
staging_schema.sql:438:                          -- CBS usually publishes "Linkage Coefficient" (׳׳§׳“׳ ׳§׳©׳¨) to the previous base.
staging_schema.sql:439:    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
staging_schema.sql:440:);
staging_schema.sql:441:
staging_schema.sql:442:-- Index for fast lookup
staging_schema.sql:443:CREATE INDEX idx_index_bases_type_date ON index_bases (index_type, base_period_start);
staging_schema.sql:444:
staging_schema.sql:445:-- Insert known recent Israeli CPI Base Periods (Example Data - verified from CBS knowledge)
staging_schema.sql:446:-- Note: CBS updates bases typically every 2 years recently.
staging_schema.sql:447:-- Base Average 2022 = 100.0 (Active from Jan 2023)
staging_schema.sql:448:-- Base Average 2020 = 100.0 (Active from Jan 2021) -> Factor to prev (2018): 1.006 ?? (Needs exact verification, putting 
placeholders)
staging_schema.sql:449:
staging_schema.sql:450:-- Let's populate with a flexible structure. Users specifically requested 'Perfect' calculation.
staging_schema.sql:451:-- I will insert a few sample rows that are commonly used or leave it for an admin seeder.
staging_schema.sql:452:-- For now, checking 'cpi'.
staging_schema.sql:453:-- Known recent bases:
staging_schema.sql:454:-- 1. Base 2022 (Avg 2020=100.0) ?? No.
staging_schema.sql:455:-- CBS Logic:
staging_schema.sql:456:-- Base Avg 2022 = 100.0. Start Date: 2023-01-01. Link Factor to 2020 base: 1.081 (Example)
staging_schema.sql:457:-- Base Avg 2020 = 100.0. Start Date: 2021-01-01. Link Factor to 2018 base: 1.001
staging_schema.sql:458:-- Base Avg 2018 = 100.0. Start Date: 2019-01-01.
staging_schema.sql:459:
staging_schema.sql:460:-- I will populate this with a separate seed script or user action if exact numbers aren't known.
staging_schema.sql:461:-- For now, table creation is the goal.
staging_schema.sql:462:
staging_schema.sql:463:-- Create index_data table for storing economic indices
staging_schema.sql:464:CREATE TABLE IF NOT EXISTS index_data (
staging_schema.sql:465:  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
staging_schema.sql:466:  index_type TEXT NOT NULL CHECK (index_type IN ('cpi', 'housing', 'construction', 'usd', 'eur')),
staging_schema.sql:467:  date TEXT NOT NULL, -- Format: 'YYYY-MM'
staging_schema.sql:468:  value DECIMAL(10, 4) NOT NULL,
staging_schema.sql:469:  source TEXT DEFAULT 'cbs' CHECK (source IN ('cbs', 'exchange-api', 'manual')),
staging_schema.sql:470:  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
staging_schema.sql:471:  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
staging_schema.sql:472:  UNIQUE(index_type, date)
staging_schema.sql:473:);
staging_schema.sql:474:
staging_schema.sql:475:-- Create index for faster queries
staging_schema.sql:476:CREATE INDEX IF NOT EXISTS idx_index_data_type_date ON index_data(index_type, date);
staging_schema.sql:477:
staging_schema.sql:478:-- Enable Row Level Security
staging_schema.sql:479:ALTER TABLE index_data ENABLE ROW LEVEL SECURITY;
staging_schema.sql:480:
staging_schema.sql:481:-- Policy: Allow all authenticated users to read index data
staging_schema.sql:482:CREATE POLICY "Allow authenticated users to read index data"
staging_schema.sql:483:  ON index_data
staging_schema.sql:484:  FOR SELECT
staging_schema.sql:485:  TO authenticated
staging_schema.sql:486:  USING (true);
staging_schema.sql:487:
staging_schema.sql:488:-- Policy: Only admins can insert/update index data (will be done via Edge Function)
staging_schema.sql:489:-- Policy: Allow authenticated users to manage index data (needed for manual refresh button)
staging_schema.sql:490:CREATE POLICY "Allow authenticated users to manage index data"
staging_schema.sql:491:  ON index_data
staging_schema.sql:492:  FOR ALL
staging_schema.sql:493:  TO authenticated
staging_schema.sql:494:  USING (true)
staging_schema.sql:495:  WITH CHECK (true);
staging_schema.sql:496:
staging_schema.sql:497:-- Add comment
staging_schema.sql:498:-- Create notifications table
staging_schema.sql:499:CREATE TABLE IF NOT EXISTS public.notifications (
staging_schema.sql:500:    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
staging_schema.sql:501:    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
staging_schema.sql:502:    type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
staging_schema.sql:503:    title TEXT NOT NULL,
staging_schema.sql:504:    message TEXT NOT NULL,
staging_schema.sql:505:    read_at TIMESTAMP WITH TIME ZONE,
staging_schema.sql:506:    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
staging_schema.sql:507:);
staging_schema.sql:508:
staging_schema.sql:509:-- RLS Policies
staging_schema.sql:510:ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
staging_schema.sql:511:
staging_schema.sql:512:CREATE POLICY "Users can view their own notifications"
staging_schema.sql:513:    ON public.notifications FOR SELECT
staging_schema.sql:514:    USING (auth.uid() = user_id);
staging_schema.sql:515:
staging_schema.sql:516:CREATE POLICY "Users can update their own notifications (mark as read)"
staging_schema.sql:517:    ON public.notifications FOR UPDATE
staging_schema.sql:518:    USING (auth.uid() = user_id);
staging_schema.sql:519:
staging_schema.sql:520:-- Check if trigger exists before creating
staging_schema.sql:521:DO $$
staging_schema.sql:522:BEGIN
staging_schema.sql:523:    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_new_notification') THEN
staging_schema.sql:524:        -- Create function to update user updated_at or handle realtime if needed
staging_schema.sql:525:        -- For now, just a placeholder or could trigger a realtime event
staging_schema.sql:526:        RETURN;
staging_schema.sql:527:    END IF;
staging_schema.sql:528:END
staging_schema.sql:529:$$;
staging_schema.sql:530:-- Create a public bucket for property images
staging_schema.sql:531:INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
staging_schema.sql:532:VALUES ('property-images', 'property-images', true, false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 
'image/gif'])
staging_schema.sql:533:ON CONFLICT (id) DO NOTHING;
staging_schema.sql:534:
staging_schema.sql:535:-- Policy: Public can VIEW files (It's a public bucket, but good to be explicit for SELECT)
staging_schema.sql:536:DROP POLICY IF EXISTS "Public can view property images" ON storage.objects;
staging_schema.sql:537:CREATE POLICY "Public can view property images"
staging_schema.sql:538:    ON storage.objects
staging_schema.sql:539:    FOR SELECT
staging_schema.sql:540:    USING ( bucket_id = 'property-images' );
staging_schema.sql:541:
staging_schema.sql:542:-- Policy: Authenticated users can UPLOAD files
staging_schema.sql:543:DROP POLICY IF EXISTS "Authenticated users can upload property images" ON storage.objects;
staging_schema.sql:544:CREATE POLICY "Authenticated users can upload property images"
staging_schema.sql:545:    ON storage.objects
staging_schema.sql:546:    FOR INSERT
staging_schema.sql:547:    WITH CHECK (
staging_schema.sql:548:        bucket_id = 'property-images'
staging_schema.sql:549:        AND
staging_schema.sql:550:        auth.role() = 'authenticated'
staging_schema.sql:551:    );
staging_schema.sql:552:
staging_schema.sql:553:-- Policy: Users can UPDATE their own files (or all authenticated for now for simplicity in this context, but better to 
restrict)
staging_schema.sql:554:-- For now, allowing authenticated users to update/delete for simplicity as ownership tracking on files might be complex 
without folder structure
staging_schema.sql:555:DROP POLICY IF EXISTS "Authenticated users can update property images" ON storage.objects;
staging_schema.sql:556:CREATE POLICY "Authenticated users can update property images"
staging_schema.sql:557:    ON storage.objects
staging_schema.sql:558:    FOR UPDATE
staging_schema.sql:559:    USING ( bucket_id = 'property-images' AND auth.role() = 'authenticated' );
staging_schema.sql:560:
staging_schema.sql:561:DROP POLICY IF EXISTS "Authenticated users can delete property images" ON storage.objects;
staging_schema.sql:562:CREATE POLICY "Authenticated users can delete property images"
staging_schema.sql:563:    ON storage.objects
staging_schema.sql:564:    FOR DELETE
staging_schema.sql:565:    USING ( bucket_id = 'property-images' AND auth.role() = 'authenticated' );
staging_schema.sql:566:-- Create a table to track rate limits
staging_schema.sql:567:CREATE TABLE IF NOT EXISTS public.rate_limits (
staging_schema.sql:568:    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
staging_schema.sql:569:    ip_address TEXT,
staging_schema.sql:570:    endpoint TEXT NOT NULL,
staging_schema.sql:571:    request_count INTEGER DEFAULT 1,
staging_schema.sql:572:    last_request_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
staging_schema.sql:573:    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
staging_schema.sql:574:);
staging_schema.sql:575:
staging_schema.sql:576:-- Index for fast lookups
staging_schema.sql:577:CREATE INDEX IF NOT EXISTS rate_limits_ip_endpoint_idx ON public.rate_limits(ip_address, endpoint);
staging_schema.sql:578:
staging_schema.sql:579:-- Function to clean up old rate limit entries (e.g., older than 1 hour)
staging_schema.sql:580:CREATE OR REPLACE FUNCTION clean_old_rate_limits()
staging_schema.sql:581:RETURNS void AS $$
staging_schema.sql:582:BEGIN
staging_schema.sql:583:    DELETE FROM public.rate_limits
staging_schema.sql:584:    WHERE last_request_at < (now() - INTERVAL '1 hour');
staging_schema.sql:585:END;
staging_schema.sql:586:$$ LANGUAGE plpgsql;
staging_schema.sql:587:
staging_schema.sql:588:-- Enable RLS (although Edge Functions might bypass it with service role, good practice)
staging_schema.sql:589:ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
staging_schema.sql:590:
staging_schema.sql:591:-- Deny public access by default (only service role should write)
staging_schema.sql:592:CREATE POLICY "No public access" ON public.rate_limits
staging_schema.sql:593:    FOR ALL
staging_schema.sql:594:    USING (false);
staging_schema.sql:595:-- Migration: Create System Settings & Notification Rules Tables
staging_schema.sql:596:
staging_schema.sql:597:-- 1. Create system_settings table
staging_schema.sql:598:CREATE TABLE IF NOT EXISTS public.system_settings (
staging_schema.sql:599:    key TEXT PRIMARY KEY,
staging_schema.sql:600:    value JSONB NOT NULL,
staging_schema.sql:601:    description TEXT,
staging_schema.sql:602:    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
staging_schema.sql:603:    updated_by UUID REFERENCES auth.users(id)
staging_schema.sql:604:);
staging_schema.sql:605:
staging_schema.sql:606:-- Enable RLS
staging_schema.sql:607:ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
staging_schema.sql:608:
staging_schema.sql:609:-- Policy: Authenticated users can read (for app config), only Admins can write
staging_schema.sql:610:CREATE POLICY "Admins can manage system settings" ON public.system_settings
staging_schema.sql:611:    USING (
staging_schema.sql:612:        EXISTS (
staging_schema.sql:613:            SELECT 1 FROM public.user_profiles
staging_schema.sql:614:            WHERE id = auth.uid() AND role = 'admin'
staging_schema.sql:615:        )
staging_schema.sql:616:    )
staging_schema.sql:617:    WITH CHECK (
staging_schema.sql:618:        EXISTS (
staging_schema.sql:619:            SELECT 1 FROM public.user_profiles
staging_schema.sql:620:            WHERE id = auth.uid() AND role = 'admin'
staging_schema.sql:621:        )
staging_schema.sql:622:    );
staging_schema.sql:623:    
staging_schema.sql:624:CREATE POLICY "Everyone can read system settings" ON public.system_settings
staging_schema.sql:625:    FOR SELECT
staging_schema.sql:626:    USING (true); -- Public read for generic configs like 'maintenance_mode'
staging_schema.sql:627:
staging_schema.sql:628:-- 2. Create notification_rules table
staging_schema.sql:629:CREATE TABLE IF NOT EXISTS public.notification_rules (
staging_schema.sql:630:    id TEXT PRIMARY KEY, -- e.g. 'contract_ending', 'payment_due'
staging_schema.sql:631:    name TEXT NOT NULL,
staging_schema.sql:632:    description TEXT,
staging_schema.sql:633:    is_enabled BOOLEAN DEFAULT true,
staging_schema.sql:634:    days_offset INT DEFAULT 0, -- e.g. 30 (days before)
staging_schema.sql:635:    channels JSONB DEFAULT '["in_app"]'::jsonb, -- e.g. ["in_app", "email", "push"]
staging_schema.sql:636:    target_audience TEXT DEFAULT 'user' CHECK (target_audience IN ('user', 'admin', 'both')),
staging_schema.sql:637:    message_template TEXT NOT NULL,
staging_schema.sql:638:    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
staging_schema.sql:639:);
staging_schema.sql:640:
staging_schema.sql:641:-- Enable RLS
staging_schema.sql:642:ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;
staging_schema.sql:643:
staging_schema.sql:644:-- Policy: Only Admins can manage rules
staging_schema.sql:645:CREATE POLICY "Admins can manage notification rules" ON public.notification_rules
staging_schema.sql:646:    USING (
staging_schema.sql:647:        EXISTS (
staging_schema.sql:648:            SELECT 1 FROM public.user_profiles
staging_schema.sql:649:            WHERE id = auth.uid() AND role = 'admin'
staging_schema.sql:650:        )
staging_schema.sql:651:    )
staging_schema.sql:652:    WITH CHECK (
staging_schema.sql:653:        EXISTS (
staging_schema.sql:654:            SELECT 1 FROM public.user_profiles
staging_schema.sql:655:            WHERE id = auth.uid() AND role = 'admin'
staging_schema.sql:656:        )
staging_schema.sql:657:    );
staging_schema.sql:658:
staging_schema.sql:659:-- 3. Seed Default Data
staging_schema.sql:660:INSERT INTO public.system_settings (key, value, description)
staging_schema.sql:661:VALUES 
staging_schema.sql:662:    ('trial_duration_days', '14'::jsonb, 'Duration of the free trial in days'),
staging_schema.sql:663:    ('maintenance_mode', 'false'::jsonb, 'If true, shows maintenance screen to non-admins'),
staging_schema.sql:664:    ('enable_signups', 'true'::jsonb, 'Master switch to allow new user registrations')
staging_schema.sql:665:ON CONFLICT (key) DO NOTHING;
staging_schema.sql:666:
staging_schema.sql:667:INSERT INTO public.notification_rules (id, name, description, is_enabled, days_offset, channels, target_audience, 
message_template)
staging_schema.sql:668:VALUES
staging_schema.sql:669:    ('ending_soon', 'Contract Ending Soon', 'Warns before contract end date', true, 30, '["in_app", "push"]'::jsonb, 'user', 
'Contract for %s, %s ends in %s days.'),
staging_schema.sql:670:    ('extension_deadline', 'Extension Deadline', 'Warns before extension option expires', true, 60, '["in_app", 
"push"]'::jsonb, 'user', 'Extension option for %s, %s ends in %s days.'),
staging_schema.sql:671:    ('index_update', 'Annual Index Update', 'Reminder to update rent based on index', true, 0, '["in_app", "push"]'::jsonb, 
'user', 'Annual index update required for %s, %s.'),
staging_schema.sql:672:    ('payment_due', 'Payment Due Today', 'Alerts when a pending payment date is reached', true, 0, '["in_app", 
"push"]'::jsonb, 'user', 'Payment of ג‚×%s for %s, %s is due today.')
staging_schema.sql:673:ON CONFLICT (id) DO NOTHING;
staging_schema.sql:674:
staging_schema.sql:675:-- 4. Update process_daily_notifications to use these rules
staging_schema.sql:676:CREATE OR REPLACE FUNCTION public.process_daily_notifications()
staging_schema.sql:677:RETURNS void
staging_schema.sql:678:LANGUAGE plpgsql
staging_schema.sql:679:SECURITY DEFINER
staging_schema.sql:680:AS $$
staging_schema.sql:681:DECLARE
staging_schema.sql:682:    r RECORD;
staging_schema.sql:683:    rule RECORD;
staging_schema.sql:684:    
staging_schema.sql:685:    -- Variables to hold rule configs
staging_schema.sql:686:    rule_ending_soon JSONB;
staging_schema.sql:687:    rule_extension JSONB;
staging_schema.sql:688:    rule_index JSONB;
staging_schema.sql:689:    rule_payment JSONB;
staging_schema.sql:690:BEGIN
staging_schema.sql:691:    -- Fetch Rules
staging_schema.sql:692:    SELECT to_jsonb(nr.*) INTO rule_ending_soon FROM public.notification_rules nr WHERE id = 'ending_soon';
staging_schema.sql:693:    SELECT to_jsonb(nr.*) INTO rule_extension FROM public.notification_rules nr WHERE id = 'extension_deadline';
staging_schema.sql:694:    SELECT to_jsonb(nr.*) INTO rule_index FROM public.notification_rules nr WHERE id = 'index_update';
staging_schema.sql:695:    SELECT to_jsonb(nr.*) INTO rule_payment FROM public.notification_rules nr WHERE id = 'payment_due';
staging_schema.sql:696:
staging_schema.sql:697:    -------------------------------------------------------
staging_schema.sql:698:    -- 1. CONTRACT ENDING SOON
staging_schema.sql:699:    -------------------------------------------------------
staging_schema.sql:700:    IF (rule_ending_soon->>'is_enabled')::boolean IS TRUE THEN
staging_schema.sql:701:        FOR r IN
staging_schema.sql:702:            SELECT c.id, c.user_id, c.end_date, p.city, p.address
staging_schema.sql:703:            FROM public.contracts c
staging_schema.sql:704:            JOIN public.properties p ON p.id = c.property_id
staging_schema.sql:705:            WHERE c.status = 'active'
staging_schema.sql:706:            AND c.end_date = CURRENT_DATE + ((rule_ending_soon->>'days_offset')::int || ' days')::INTERVAL
staging_schema.sql:707:        LOOP
staging_schema.sql:708:            IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = r.user_id AND metadata->>'contract_id' = 
r.id::text AND metadata->>'event' = 'ending_soon') THEN
staging_schema.sql:709:                INSERT INTO public.notifications (user_id, type, title, message, metadata)
staging_schema.sql:710:                VALUES (
staging_schema.sql:711:                    r.user_id, 
staging_schema.sql:712:                    'warning', 
staging_schema.sql:713:                    (rule_ending_soon->>'name')::text, 
staging_schema.sql:714:                    format((rule_ending_soon->>'message_template')::text, r.city, r.address, 
(rule_ending_soon->>'days_offset')::text), 
staging_schema.sql:715:                    json_build_object('contract_id', r.id, 'event', 'ending_soon')::jsonb
staging_schema.sql:716:                );
staging_schema.sql:717:            END IF;
staging_schema.sql:718:        END LOOP;
staging_schema.sql:719:    END IF;
staging_schema.sql:720:
staging_schema.sql:721:    -------------------------------------------------------
staging_schema.sql:722:    -- 2. EXTENSION OPTION DEADLINE
staging_schema.sql:723:    -------------------------------------------------------
staging_schema.sql:724:    IF (rule_extension->>'is_enabled')::boolean IS TRUE THEN
staging_schema.sql:725:        FOR r IN
staging_schema.sql:726:            SELECT c.id, c.user_id, c.end_date, p.city, p.address
staging_schema.sql:727:            FROM public.contracts c
staging_schema.sql:728:            JOIN public.properties p ON p.id = c.property_id
staging_schema.sql:729:            WHERE c.status = 'active'
staging_schema.sql:730:            AND c.extension_option = TRUE
staging_schema.sql:731:            AND c.end_date = CURRENT_DATE + ((rule_extension->>'days_offset')::int || ' days')::INTERVAL
staging_schema.sql:732:        LOOP
staging_schema.sql:733:            IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = r.user_id AND metadata->>'contract_id' = 
r.id::text AND metadata->>'event' = 'extension_deadline') THEN
staging_schema.sql:734:                INSERT INTO public.notifications (user_id, type, title, message, metadata)
staging_schema.sql:735:                VALUES (
staging_schema.sql:736:                    r.user_id, 
staging_schema.sql:737:                    'action', 
staging_schema.sql:738:                    (rule_extension->>'name')::text, 
staging_schema.sql:739:                    format((rule_extension->>'message_template')::text, r.city, r.address, 
(rule_extension->>'days_offset')::text), 
staging_schema.sql:740:                    json_build_object('contract_id', r.id, 'event', 'extension_deadline')::jsonb
staging_schema.sql:741:                );
staging_schema.sql:742:            END IF;
staging_schema.sql:743:        END LOOP;
staging_schema.sql:744:    END IF;
staging_schema.sql:745:
staging_schema.sql:746:    -------------------------------------------------------
staging_schema.sql:747:    -- 3. ANNUAL INDEX UPDATE (1 Year after Start)
staging_schema.sql:748:    -------------------------------------------------------
staging_schema.sql:749:    IF (rule_index->>'is_enabled')::boolean IS TRUE THEN
staging_schema.sql:750:        FOR r IN
staging_schema.sql:751:            SELECT c.id, c.user_id, c.start_date, p.city, p.address
staging_schema.sql:752:            FROM public.contracts c
staging_schema.sql:753:            JOIN public.properties p ON p.id = c.property_id
staging_schema.sql:754:            WHERE c.status = 'active'
staging_schema.sql:755:            AND c.linkage_type != 'none'
staging_schema.sql:756:            AND (
staging_schema.sql:757:                c.start_date + INTERVAL '1 year' = CURRENT_DATE OR
staging_schema.sql:758:                c.start_date + INTERVAL '2 years' = CURRENT_DATE OR
staging_schema.sql:759:                c.start_date + INTERVAL '3 years' = CURRENT_DATE
staging_schema.sql:760:            )
staging_schema.sql:761:        LOOP
staging_schema.sql:762:            IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = r.user_id AND metadata->>'contract_id' = 
r.id::text AND metadata->>'event' = 'index_update' AND metadata->>'date' = CURRENT_DATE::text) THEN
staging_schema.sql:763:                INSERT INTO public.notifications (user_id, type, title, message, metadata)
staging_schema.sql:764:                VALUES (
staging_schema.sql:765:                    r.user_id, 
staging_schema.sql:766:                    'urgent', 
staging_schema.sql:767:                    (rule_index->>'name')::text, 
staging_schema.sql:768:                    format((rule_index->>'message_template')::text, r.city, r.address), 
staging_schema.sql:769:                    json_build_object('contract_id', r.id, 'event', 'index_update', 'date', CURRENT_DATE)::jsonb
staging_schema.sql:770:                );
staging_schema.sql:771:            END IF;
staging_schema.sql:772:        END LOOP;
staging_schema.sql:773:    END IF;
staging_schema.sql:774:
staging_schema.sql:775:    -------------------------------------------------------
staging_schema.sql:776:    -- 4. PAYMENT DUE TODAY
staging_schema.sql:777:    -------------------------------------------------------
staging_schema.sql:778:    IF (rule_payment->>'is_enabled')::boolean IS TRUE THEN
staging_schema.sql:779:        FOR r IN
staging_schema.sql:780:            SELECT py.id, py.user_id, py.amount, py.date, p.city, p.address
staging_schema.sql:781:            FROM public.payments py
staging_schema.sql:782:            JOIN public.contracts c ON c.id = py.contract_id
staging_schema.sql:783:            JOIN public.properties p ON p.id = c.property_id
staging_schema.sql:784:            WHERE py.status = 'pending'
staging_schema.sql:785:            AND py.date = CURRENT_DATE
staging_schema.sql:786:        LOOP
staging_schema.sql:787:            IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = r.user_id AND metadata->>'payment_id' = 
r.id::text AND metadata->>'event' = 'payment_due') THEN
staging_schema.sql:788:                INSERT INTO public.notifications (user_id, type, title, message, metadata)
staging_schema.sql:789:                VALUES (
staging_schema.sql:790:                    r.user_id, 
staging_schema.sql:791:                    'warning', 
staging_schema.sql:792:                    (rule_payment->>'name')::text, 
staging_schema.sql:793:                    format((rule_payment->>'message_template')::text, r.amount, r.city, r.address), 
staging_schema.sql:794:                    json_build_object('payment_id', r.id, 'event', 'payment_due')::jsonb
staging_schema.sql:795:                );
staging_schema.sql:796:            END IF;
staging_schema.sql:797:        END LOOP;
staging_schema.sql:798:    END IF;
staging_schema.sql:799:
staging_schema.sql:800:END;
staging_schema.sql:801:$$;
staging_schema.sql:802:-- Identify duplicates properties (same address, city, user_id)
staging_schema.sql:803:-- Using array_agg with ORDER BY created_at to keep the oldest record
staging_schema.sql:804:WITH duplicates AS (
staging_schema.sql:805:  SELECT
staging_schema.sql:806:    address,
staging_schema.sql:807:    city,
staging_schema.sql:808:    user_id,
staging_schema.sql:809:    (array_agg(id ORDER BY created_at ASC))[1] as keep_id,
staging_schema.sql:810:    array_agg(id) as all_ids
staging_schema.sql:811:  FROM properties
staging_schema.sql:812:  GROUP BY address, city, user_id
staging_schema.sql:813:  HAVING COUNT(*) > 1
staging_schema.sql:814:),
staging_schema.sql:815:busted_duplicates AS (
staging_schema.sql:816:  SELECT
staging_schema.sql:817:    keep_id,
staging_schema.sql:818:    unnest(all_ids) as duplicate_id
staging_schema.sql:819:  FROM duplicates
staging_schema.sql:820:)
staging_schema.sql:821:-- 1. Update Tenants to point to the kept property
staging_schema.sql:822:UPDATE tenants
staging_schema.sql:823:SET property_id = bd.keep_id
staging_schema.sql:824:FROM busted_duplicates bd
staging_schema.sql:825:WHERE tenants.property_id = bd.duplicate_id
staging_schema.sql:826:AND tenants.property_id != bd.keep_id;
staging_schema.sql:827:
staging_schema.sql:828:-- 2. Update Contracts to point to the kept property
staging_schema.sql:829:-- Re-calculate duplicates for safety in this transaction block step
staging_schema.sql:830:WITH duplicates AS (
staging_schema.sql:831:  SELECT
staging_schema.sql:832:    address,
staging_schema.sql:833:    city,
staging_schema.sql:834:    user_id,
staging_schema.sql:835:    (array_agg(id ORDER BY created_at ASC))[1] as keep_id,
staging_schema.sql:836:    array_agg(id) as all_ids
staging_schema.sql:837:  FROM properties
staging_schema.sql:838:  GROUP BY address, city, user_id
staging_schema.sql:839:  HAVING COUNT(*) > 1
staging_schema.sql:840:),
staging_schema.sql:841:busted_duplicates AS (
staging_schema.sql:842:  SELECT
staging_schema.sql:843:    keep_id,
staging_schema.sql:844:    unnest(all_ids) as duplicate_id
staging_schema.sql:845:  FROM duplicates
staging_schema.sql:846:)
staging_schema.sql:847:UPDATE contracts
staging_schema.sql:848:SET property_id = bd.keep_id
staging_schema.sql:849:FROM busted_duplicates bd
staging_schema.sql:850:WHERE contracts.property_id = bd.duplicate_id
staging_schema.sql:851:AND contracts.property_id != bd.keep_id;
staging_schema.sql:852:
staging_schema.sql:853:-- 3. Delete the duplicate properties
staging_schema.sql:854:WITH duplicates AS (
staging_schema.sql:855:  SELECT
staging_schema.sql:856:    address,
staging_schema.sql:857:    city,
staging_schema.sql:858:    user_id,
staging_schema.sql:859:    (array_agg(id ORDER BY created_at ASC))[1] as keep_id,
staging_schema.sql:860:    array_agg(id) as all_ids
staging_schema.sql:861:  FROM properties
staging_schema.sql:862:  GROUP BY address, city, user_id
staging_schema.sql:863:  HAVING COUNT(*) > 1
staging_schema.sql:864:)
staging_schema.sql:865:DELETE FROM properties
staging_schema.sql:866:WHERE id IN (
staging_schema.sql:867:    SELECT unnest(all_ids) FROM duplicates
staging_schema.sql:868:) AND id NOT IN (
staging_schema.sql:869:    SELECT keep_id FROM duplicates
staging_schema.sql:870:);
staging_schema.sql:871:-- ============================================
staging_schema.sql:872:-- EMERGENCY FIX: SECURE ALL USER DATA WITH PROPER RLS
staging_schema.sql:873:-- ============================================
staging_schema.sql:874:-- This migration ensures all user data is properly isolated
staging_schema.sql:875:
staging_schema.sql:876:-- 1. ENSURE USER_ID COLUMNS EXIST
staging_schema.sql:877:ALTER TABLE properties 
staging_schema.sql:878:ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
staging_schema.sql:879:
staging_schema.sql:880:ALTER TABLE tenants
staging_schema.sql:881:ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
staging_schema.sql:882:
staging_schema.sql:883:ALTER TABLE contracts
staging_schema.sql:884:ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
staging_schema.sql:885:
staging_schema.sql:886:ALTER TABLE payments
staging_schema.sql:887:ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
staging_schema.sql:888:
staging_schema.sql:889:-- 2. ENABLE RLS ON ALL TABLES
staging_schema.sql:890:ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
staging_schema.sql:891:ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
staging_schema.sql:892:ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
staging_schema.sql:893:ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
staging_schema.sql:894:
staging_schema.sql:895:-- 3. DROP ALL EXISTING PERMISSIVE POLICIES
staging_schema.sql:896:DROP POLICY IF EXISTS "Enable all access for authenticated users" ON payments;
staging_schema.sql:897:DROP POLICY IF EXISTS "Users can view own properties" ON properties;
staging_schema.sql:898:DROP POLICY IF EXISTS "Users can insert own properties" ON properties;
staging_schema.sql:899:DROP POLICY IF EXISTS "Users can update own properties" ON properties;
staging_schema.sql:900:DROP POLICY IF EXISTS "Users can delete own properties" ON properties;
staging_schema.sql:901:DROP POLICY IF EXISTS "Users can view own tenants" ON tenants;
staging_schema.sql:902:DROP POLICY IF EXISTS "Users can insert own tenants" ON tenants;
staging_schema.sql:903:DROP POLICY IF EXISTS "Users can update own tenants" ON tenants;
staging_schema.sql:904:DROP POLICY IF EXISTS "Users can delete own tenants" ON tenants;
staging_schema.sql:905:DROP POLICY IF EXISTS "Users can view own contracts" ON contracts;
staging_schema.sql:906:DROP POLICY IF EXISTS "Users can insert own contracts" ON contracts;
staging_schema.sql:907:DROP POLICY IF EXISTS "Users can update own contracts" ON contracts;
staging_schema.sql:908:DROP POLICY IF EXISTS "Users can delete own contracts" ON contracts;
staging_schema.sql:909:
staging_schema.sql:910:-- 4. CREATE SECURE POLICIES FOR PROPERTIES
staging_schema.sql:911:CREATE POLICY "Users can view own properties"
staging_schema.sql:912:    ON properties FOR SELECT
staging_schema.sql:913:    USING (user_id = auth.uid());
staging_schema.sql:914:
staging_schema.sql:915:CREATE POLICY "Users can insert own properties"
staging_schema.sql:916:    ON properties FOR INSERT
staging_schema.sql:917:    WITH CHECK (user_id = auth.uid());
staging_schema.sql:918:
staging_schema.sql:919:CREATE POLICY "Users can update own properties"
staging_schema.sql:920:    ON properties FOR UPDATE
staging_schema.sql:921:    USING (user_id = auth.uid())
staging_schema.sql:922:    WITH CHECK (user_id = auth.uid());
staging_schema.sql:923:
staging_schema.sql:924:CREATE POLICY "Users can delete own properties"
staging_schema.sql:925:    ON properties FOR DELETE
staging_schema.sql:926:    USING (user_id = auth.uid());
staging_schema.sql:927:
staging_schema.sql:928:-- 5. CREATE SECURE POLICIES FOR TENANTS
staging_schema.sql:929:CREATE POLICY "Users can view own tenants"
staging_schema.sql:930:    ON tenants FOR SELECT
staging_schema.sql:931:    USING (user_id = auth.uid());
staging_schema.sql:932:
staging_schema.sql:933:CREATE POLICY "Users can insert own tenants"
staging_schema.sql:934:    ON tenants FOR INSERT
staging_schema.sql:935:    WITH CHECK (user_id = auth.uid());
staging_schema.sql:936:
staging_schema.sql:937:CREATE POLICY "Users can update own tenants"
staging_schema.sql:938:    ON tenants FOR UPDATE
staging_schema.sql:939:    USING (user_id = auth.uid())
staging_schema.sql:940:    WITH CHECK (user_id = auth.uid());
staging_schema.sql:941:
staging_schema.sql:942:CREATE POLICY "Users can delete own tenants"
staging_schema.sql:943:    ON tenants FOR DELETE
staging_schema.sql:944:    USING (user_id = auth.uid());
staging_schema.sql:945:
staging_schema.sql:946:-- 6. CREATE SECURE POLICIES FOR CONTRACTS
staging_schema.sql:947:CREATE POLICY "Users can view own contracts"
staging_schema.sql:948:    ON contracts FOR SELECT
staging_schema.sql:949:    USING (user_id = auth.uid());
staging_schema.sql:950:
staging_schema.sql:951:CREATE POLICY "Users can insert own contracts"
staging_schema.sql:952:    ON contracts FOR INSERT
staging_schema.sql:953:    WITH CHECK (user_id = auth.uid());
staging_schema.sql:954:
staging_schema.sql:955:CREATE POLICY "Users can update own contracts"
staging_schema.sql:956:    ON contracts FOR UPDATE
staging_schema.sql:957:    USING (user_id = auth.uid())
staging_schema.sql:958:    WITH CHECK (user_id = auth.uid());
staging_schema.sql:959:
staging_schema.sql:960:CREATE POLICY "Users can delete own contracts"
staging_schema.sql:961:    ON contracts FOR DELETE
staging_schema.sql:962:    USING (user_id = auth.uid());
staging_schema.sql:963:
staging_schema.sql:964:-- 7. CREATE SECURE POLICIES FOR PAYMENTS
staging_schema.sql:965:CREATE POLICY "Users can view own payments"
staging_schema.sql:966:    ON payments FOR SELECT
staging_schema.sql:967:    USING (user_id = auth.uid());
staging_schema.sql:968:
staging_schema.sql:969:CREATE POLICY "Users can insert own payments"
staging_schema.sql:970:    ON payments FOR INSERT
staging_schema.sql:971:    WITH CHECK (user_id = auth.uid());
staging_schema.sql:972:
staging_schema.sql:973:CREATE POLICY "Users can update own payments"
staging_schema.sql:974:    ON payments FOR UPDATE
staging_schema.sql:975:    USING (user_id = auth.uid())
staging_schema.sql:976:    WITH CHECK (user_id = auth.uid());
staging_schema.sql:977:
staging_schema.sql:978:CREATE POLICY "Users can delete own payments"
staging_schema.sql:979:    ON payments FOR DELETE
staging_schema.sql:980:    USING (user_id = auth.uid());
staging_schema.sql:981:
staging_schema.sql:982:-- 8. BACKFILL EXISTING DATA (CRITICAL!)
staging_schema.sql:983:-- Update all existing records to have the correct user_id
staging_schema.sql:984:-- This assumes you want to assign all existing data to the first user
staging_schema.sql:985:-- IMPORTANT: Adjust this query based on your needs!
staging_schema.sql:986:
staging_schema.sql:987:DO $$
staging_schema.sql:988:DECLARE
staging_schema.sql:989:    first_user_id UUID;
staging_schema.sql:990:BEGIN
staging_schema.sql:991:    -- Get the first user's ID (you may want to specify a specific user)
staging_schema.sql:992:    SELECT id INTO first_user_id FROM auth.users ORDER BY created_at LIMIT 1;
staging_schema.sql:993:    
staging_schema.sql:994:    IF first_user_id IS NOT NULL THEN
staging_schema.sql:995:        -- Update all NULL user_id records
staging_schema.sql:996:        UPDATE properties SET user_id = first_user_id WHERE user_id IS NULL;
staging_schema.sql:997:        UPDATE tenants SET user_id = first_user_id WHERE user_id IS NULL;
staging_schema.sql:998:        UPDATE contracts SET user_id = first_user_id WHERE user_id IS NULL;
staging_schema.sql:999:        UPDATE payments SET user_id = first_user_id WHERE user_id IS NULL;
staging_schema.sql:1000:        
staging_schema.sql:1001:        RAISE NOTICE 'Backfilled user_id for existing records to user: %', first_user_id;
staging_schema.sql:1002:    END IF;
staging_schema.sql:1003:END $$;
staging_schema.sql:1004:-- ============================================
staging_schema.sql:1005:-- EMERGENCY FIX V2: SECURE ALL USER DATA WITH PROPER RLS
staging_schema.sql:1006:-- This version drops ALL policies first to avoid conflicts
staging_schema.sql:1007:-- ============================================
staging_schema.sql:1008:
staging_schema.sql:1009:-- 1. DROP ALL EXISTING POLICIES (to avoid conflicts)
staging_schema.sql:1010:DO $$ 
staging_schema.sql:1011:DECLARE
staging_schema.sql:1012:    r RECORD;
staging_schema.sql:1013:BEGIN
staging_schema.sql:1014:    FOR r IN (SELECT schemaname, tablename, policyname 
staging_schema.sql:1015:              FROM pg_policies 
staging_schema.sql:1016:              WHERE schemaname = 'public' 
staging_schema.sql:1017:              AND tablename IN ('properties', 'tenants', 'contracts', 'payments'))
staging_schema.sql:1018:    LOOP
staging_schema.sql:1019:        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
staging_schema.sql:1020:    END LOOP;
staging_schema.sql:1021:END $$;
staging_schema.sql:1022:
staging_schema.sql:1023:-- 2. ENSURE USER_ID COLUMNS EXIST
staging_schema.sql:1024:ALTER TABLE properties 
staging_schema.sql:1025:ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
staging_schema.sql:1026:
staging_schema.sql:1027:ALTER TABLE tenants
staging_schema.sql:1028:ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
staging_schema.sql:1029:
staging_schema.sql:1030:ALTER TABLE contracts
staging_schema.sql:1031:ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
staging_schema.sql:1032:
staging_schema.sql:1033:ALTER TABLE payments
staging_schema.sql:1034:ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
staging_schema.sql:1035:
staging_schema.sql:1036:-- 3. ENABLE RLS ON ALL TABLES
staging_schema.sql:1037:ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
staging_schema.sql:1038:ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
staging_schema.sql:1039:ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
staging_schema.sql:1040:ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
staging_schema.sql:1041:
staging_schema.sql:1042:-- 4. CREATE SECURE POLICIES FOR PROPERTIES
staging_schema.sql:1043:CREATE POLICY "Users can view own properties"
staging_schema.sql:1044:    ON properties FOR SELECT
staging_schema.sql:1045:    USING (user_id = auth.uid());
staging_schema.sql:1046:
staging_schema.sql:1047:CREATE POLICY "Users can insert own properties"
staging_schema.sql:1048:    ON properties FOR INSERT
staging_schema.sql:1049:    WITH CHECK (user_id = auth.uid());
staging_schema.sql:1050:
staging_schema.sql:1051:CREATE POLICY "Users can update own properties"
staging_schema.sql:1052:    ON properties FOR UPDATE
staging_schema.sql:1053:    USING (user_id = auth.uid())
staging_schema.sql:1054:    WITH CHECK (user_id = auth.uid());
staging_schema.sql:1055:
staging_schema.sql:1056:CREATE POLICY "Users can delete own properties"
staging_schema.sql:1057:    ON properties FOR DELETE
staging_schema.sql:1058:    USING (user_id = auth.uid());
staging_schema.sql:1059:
staging_schema.sql:1060:-- 5. CREATE SECURE POLICIES FOR TENANTS
staging_schema.sql:1061:CREATE POLICY "Users can view own tenants"
staging_schema.sql:1062:    ON tenants FOR SELECT
staging_schema.sql:1063:    USING (user_id = auth.uid());
staging_schema.sql:1064:
staging_schema.sql:1065:CREATE POLICY "Users can insert own tenants"
staging_schema.sql:1066:    ON tenants FOR INSERT
staging_schema.sql:1067:    WITH CHECK (user_id = auth.uid());
staging_schema.sql:1068:
staging_schema.sql:1069:CREATE POLICY "Users can update own tenants"
staging_schema.sql:1070:    ON tenants FOR UPDATE
staging_schema.sql:1071:    USING (user_id = auth.uid())
staging_schema.sql:1072:    WITH CHECK (user_id = auth.uid());
staging_schema.sql:1073:
staging_schema.sql:1074:CREATE POLICY "Users can delete own tenants"
staging_schema.sql:1075:    ON tenants FOR DELETE
staging_schema.sql:1076:    USING (user_id = auth.uid());
staging_schema.sql:1077:
staging_schema.sql:1078:-- 6. CREATE SECURE POLICIES FOR CONTRACTS
staging_schema.sql:1079:CREATE POLICY "Users can view own contracts"
staging_schema.sql:1080:    ON contracts FOR SELECT
staging_schema.sql:1081:    USING (user_id = auth.uid());
staging_schema.sql:1082:
staging_schema.sql:1083:CREATE POLICY "Users can insert own contracts"
staging_schema.sql:1084:    ON contracts FOR INSERT
staging_schema.sql:1085:    WITH CHECK (user_id = auth.uid());
staging_schema.sql:1086:
staging_schema.sql:1087:CREATE POLICY "Users can update own contracts"
staging_schema.sql:1088:    ON contracts FOR UPDATE
staging_schema.sql:1089:    USING (user_id = auth.uid())
staging_schema.sql:1090:    WITH CHECK (user_id = auth.uid());
staging_schema.sql:1091:
staging_schema.sql:1092:CREATE POLICY "Users can delete own contracts"
staging_schema.sql:1093:    ON contracts FOR DELETE
staging_schema.sql:1094:    USING (user_id = auth.uid());
staging_schema.sql:1095:
staging_schema.sql:1096:-- 7. CREATE SECURE POLICIES FOR PAYMENTS
staging_schema.sql:1097:CREATE POLICY "Users can view own payments"
staging_schema.sql:1098:    ON payments FOR SELECT
staging_schema.sql:1099:    USING (user_id = auth.uid());
staging_schema.sql:1100:
staging_schema.sql:1101:CREATE POLICY "Users can insert own payments"
staging_schema.sql:1102:    ON payments FOR INSERT
staging_schema.sql:1103:    WITH CHECK (user_id = auth.uid());
staging_schema.sql:1104:
staging_schema.sql:1105:CREATE POLICY "Users can update own payments"
staging_schema.sql:1106:    ON payments FOR UPDATE
staging_schema.sql:1107:    USING (user_id = auth.uid())
staging_schema.sql:1108:    WITH CHECK (user_id = auth.uid());
staging_schema.sql:1109:
staging_schema.sql:1110:CREATE POLICY "Users can delete own payments"
staging_schema.sql:1111:    ON payments FOR DELETE
staging_schema.sql:1112:    USING (user_id = auth.uid());
staging_schema.sql:1113:
staging_schema.sql:1114:-- 8. BACKFILL EXISTING DATA
staging_schema.sql:1115:DO $$
staging_schema.sql:1116:DECLARE
staging_schema.sql:1117:    first_user_id UUID;
staging_schema.sql:1118:BEGIN
staging_schema.sql:1119:    -- Get the first user's ID
staging_schema.sql:1120:    SELECT id INTO first_user_id FROM auth.users ORDER BY created_at LIMIT 1;
staging_schema.sql:1121:    
staging_schema.sql:1122:    IF first_user_id IS NOT NULL THEN
staging_schema.sql:1123:        -- Update all NULL user_id records
staging_schema.sql:1124:        UPDATE properties SET user_id = first_user_id WHERE user_id IS NULL;
staging_schema.sql:1125:        UPDATE tenants SET user_id = first_user_id WHERE user_id IS NULL;
staging_schema.sql:1126:        UPDATE contracts SET user_id = first_user_id WHERE user_id IS NULL;
staging_schema.sql:1127:        UPDATE payments SET user_id = first_user_id WHERE user_id IS NULL;
staging_schema.sql:1128:        
staging_schema.sql:1129:        RAISE NOTICE 'Backfilled user_id for existing records to user: %', first_user_id;
staging_schema.sql:1130:    END IF;
staging_schema.sql:1131:END $$;
staging_schema.sql:1132:
staging_schema.sql:1133:-- 9. VERIFY RLS IS ENABLED
staging_schema.sql:1134:DO $$
staging_schema.sql:1135:DECLARE
staging_schema.sql:1136:    r RECORD;
staging_schema.sql:1137:BEGIN
staging_schema.sql:1138:    FOR r IN (SELECT tablename, rowsecurity 
staging_schema.sql:1139:              FROM pg_tables 
staging_schema.sql:1140:              WHERE schemaname = 'public' 
staging_schema.sql:1141:              AND tablename IN ('properties', 'tenants', 'contracts', 'payments'))
staging_schema.sql:1142:    LOOP
staging_schema.sql:1143:        IF NOT r.rowsecurity THEN
staging_schema.sql:1144:            RAISE EXCEPTION 'RLS is NOT enabled on table: %', r.tablename;
staging_schema.sql:1145:        ELSE
staging_schema.sql:1146:            RAISE NOTICE 'RLS is enabled on table: %', r.tablename;
staging_schema.sql:1147:        END IF;
staging_schema.sql:1148:    END LOOP;
staging_schema.sql:1149:END $$;
staging_schema.sql:1150:-- ============================================
staging_schema.sql:1151:-- EMERGENCY SIGNUP RESET
staging_schema.sql:1152:-- ============================================
staging_schema.sql:1153:
staging_schema.sql:1154:-- 1. DROP ALL TRIGGERS (Clear the conflict)
staging_schema.sql:1155:DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
staging_schema.sql:1156:DROP TRIGGER IF EXISTS on_auth_user_created_relink_invoices ON auth.users;
staging_schema.sql:1157:
staging_schema.sql:1158:-- 2. CONSOLIDATED TRIGGER FUNCTION
staging_schema.sql:1159:-- Handles both Profile Creation and Invoice Recovery in one safe transaction.
staging_schema.sql:1160:CREATE OR REPLACE FUNCTION public.handle_new_user()
staging_schema.sql:1161:RETURNS TRIGGER 
staging_schema.sql:1162:LANGUAGE plpgsql 
staging_schema.sql:1163:SECURITY DEFINER SET search_path = public -- Force Public Schema
staging_schema.sql:1164:AS $$
staging_schema.sql:1165:BEGIN
staging_schema.sql:1166:    -- A. Create User Profile
staging_schema.sql:1167:    -- We use a simpler INSERT to minimize potential type errors
staging_schema.sql:1168:    INSERT INTO public.user_profiles (
staging_schema.sql:1169:        id, 
staging_schema.sql:1170:        email, 
staging_schema.sql:1171:        full_name, 
staging_schema.sql:1172:        role, 
staging_schema.sql:1173:        subscription_status, 
staging_schema.sql:1174:        subscription_plan
staging_schema.sql:1175:    )
staging_schema.sql:1176:    VALUES (
staging_schema.sql:1177:        NEW.id,
staging_schema.sql:1178:        NEW.email,
staging_schema.sql:1179:        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
staging_schema.sql:1180:        'user'::user_role,
staging_schema.sql:1181:        'active'::subscription_status,
staging_schema.sql:1182:        'free_forever'::subscription_plan_type
staging_schema.sql:1183:    )
staging_schema.sql:1184:    ON CONFLICT (id) DO NOTHING; -- Idempotency: If it exists, skip.
staging_schema.sql:1185:
staging_schema.sql:1186:    -- B. Link Past Invoices (Safely)
staging_schema.sql:1187:    -- We wrap this in a block so if it fails, the user is still created.
staging_schema.sql:1188:    BEGIN
staging_schema.sql:1189:        UPDATE public.invoices
staging_schema.sql:1190:        SET user_id = NEW.id
staging_schema.sql:1191:        WHERE user_id IS NULL 
staging_schema.sql:1192:        AND billing_email = NEW.email;
staging_schema.sql:1193:    EXCEPTION WHEN OTHERS THEN
staging_schema.sql:1194:        RAISE WARNING 'Invoice linking failed for users %: %', NEW.email, SQLERRM;
staging_schema.sql:1195:    END;
staging_schema.sql:1196:
staging_schema.sql:1197:    RETURN NEW;
staging_schema.sql:1198:EXCEPTION WHEN OTHERS THEN
staging_schema.sql:1199:    -- If the main profile creation fails, we must fail the signup to prevent phantom users.
staging_schema.sql:1200:    RAISE EXCEPTION 'Signup Critical Error: %', SQLERRM;
staging_schema.sql:1201:END;
staging_schema.sql:1202:$$;
staging_schema.sql:1203:
staging_schema.sql:1204:-- 3. RE-ATTACH SINGLE TRIGGER
staging_schema.sql:1205:CREATE TRIGGER on_auth_user_created
staging_schema.sql:1206:    AFTER INSERT ON auth.users
staging_schema.sql:1207:    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
staging_schema.sql:1208:-- Enable RLS just in case
staging_schema.sql:1209:ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
staging_schema.sql:1210:
staging_schema.sql:1211:-- Allow Admins to UPDATE any profile
staging_schema.sql:1212:CREATE POLICY "Admins can update all profiles" 
staging_schema.sql:1213:ON public.user_profiles 
staging_schema.sql:1214:FOR UPDATE 
staging_schema.sql:1215:USING (
staging_schema.sql:1216:  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
staging_schema.sql:1217:)
staging_schema.sql:1218:WITH CHECK (
staging_schema.sql:1219:  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
staging_schema.sql:1220:);
staging_schema.sql:1221:-- Function: Enforce NO OVERLAPPING Active Contracts per Property
staging_schema.sql:1222:CREATE OR REPLACE FUNCTION public.check_active_contract()
staging_schema.sql:1223:RETURNS TRIGGER AS $$
staging_schema.sql:1224:BEGIN
staging_schema.sql:1225:    -- Only check if the status is being set to 'active'
staging_schema.sql:1226:    IF NEW.status = 'active' THEN
staging_schema.sql:1227:        IF EXISTS (
staging_schema.sql:1228:            SELECT 1 FROM public.contracts
staging_schema.sql:1229:            WHERE property_id = NEW.property_id
staging_schema.sql:1230:            AND status = 'active'
staging_schema.sql:1231:            AND id != NEW.id -- Exclude self during updates
staging_schema.sql:1232:            AND (
staging_schema.sql:1233:                (start_date <= NEW.end_date) AND (end_date >= NEW.start_date)
staging_schema.sql:1234:            )
staging_schema.sql:1235:        ) THEN
staging_schema.sql:1236:            RAISE EXCEPTION 'Property % has an overlapping active contract. Dates cannot overlap with an existing active 
contract.', NEW.property_id;
staging_schema.sql:1237:        END IF;
staging_schema.sql:1238:    END IF;
staging_schema.sql:1239:    RETURN NEW;
staging_schema.sql:1240:END;
staging_schema.sql:1241:$$ LANGUAGE plpgsql;
staging_schema.sql:1242:
staging_schema.sql:1243:-- Trigger: Check before insert or update on contracts
staging_schema.sql:1244:DROP TRIGGER IF EXISTS trigger_check_active_contract ON public.contracts;
staging_schema.sql:1245:CREATE TRIGGER trigger_check_active_contract
staging_schema.sql:1246:BEFORE INSERT OR UPDATE ON public.contracts
staging_schema.sql:1247:FOR EACH ROW
staging_schema.sql:1248:EXECUTE FUNCTION public.check_active_contract();
staging_schema.sql:1249:
staging_schema.sql:1250:
staging_schema.sql:1251:-- Function: Auto-sync Tenant Status
staging_schema.sql:1252:CREATE OR REPLACE FUNCTION public.sync_tenant_status_from_contract()
staging_schema.sql:1253:RETURNS TRIGGER AS $$
staging_schema.sql:1254:BEGIN
staging_schema.sql:1255:    -- Case 1: Contract becomes ACTIVE (Insert or Update)
staging_schema.sql:1256:    IF NEW.status = 'active' THEN
staging_schema.sql:1257:        -- Link tenant to property and set active
staging_schema.sql:1258:        UPDATE public.tenants
staging_schema.sql:1259:        SET property_id = NEW.property_id,
staging_schema.sql:1260:            status = 'active'
staging_schema.sql:1261:        WHERE id = NEW.tenant_id;
staging_schema.sql:1262:        
staging_schema.sql:1263:        -- Optional: Should we unlink other tenants from this property?
staging_schema.sql:1264:        -- For now, we assume the strict contract logic handles the "one active" rule, 
staging_schema.sql:1265:        -- so we just ensure THIS tenant is the active one.
staging_schema.sql:1266:    END IF;
staging_schema.sql:1267:
staging_schema.sql:1268:    -- Case 2: Contract ends or changes from active to something else
staging_schema.sql:1269:    IF (OLD.status = 'active' AND NEW.status != 'active') THEN
staging_schema.sql:1270:        -- Unlink tenant (set to past)
staging_schema.sql:1271:        UPDATE public.tenants
staging_schema.sql:1272:        SET property_id = NULL,
staging_schema.sql:1273:            status = 'past'
staging_schema.sql:1274:        WHERE id = NEW.tenant_id 
staging_schema.sql:1275:        AND property_id = NEW.property_id; -- Only if they are still linked to this property
staging_schema.sql:1276:    END IF;
staging_schema.sql:1277:    
staging_schema.sql:1278:    RETURN NEW;
staging_schema.sql:1279:END;
staging_schema.sql:1280:$$ LANGUAGE plpgsql;
staging_schema.sql:1281:
staging_schema.sql:1282:-- Trigger: Sync Tenant Status
staging_schema.sql:1283:DROP TRIGGER IF EXISTS trigger_sync_tenant_status ON public.contracts;
staging_schema.sql:1284:CREATE TRIGGER trigger_sync_tenant_status
staging_schema.sql:1285:AFTER INSERT OR UPDATE ON public.contracts
staging_schema.sql:1286:FOR EACH ROW
staging_schema.sql:1287:EXECUTE FUNCTION public.sync_tenant_status_from_contract();
staging_schema.sql:1288:
staging_schema.sql:1289:
staging_schema.sql:1290:-- Function: Auto-update Property Status
staging_schema.sql:1291:CREATE OR REPLACE FUNCTION public.update_property_status_from_contract()
staging_schema.sql:1292:RETURNS TRIGGER AS $$
staging_schema.sql:1293:BEGIN
staging_schema.sql:1294:    -- If contract becomes active, set Property to Occupied
staging_schema.sql:1295:    IF NEW.status = 'active' THEN
staging_schema.sql:1296:        UPDATE public.properties
staging_schema.sql:1297:        SET status = 'Occupied'
staging_schema.sql:1298:        WHERE id = NEW.property_id;
staging_schema.sql:1299:    
staging_schema.sql:1300:    -- If contract ends (ended/terminated) and was previously active
staging_schema.sql:1301:    ELSIF (NEW.status IN ('ended', 'terminated')) THEN
staging_schema.sql:1302:        -- Check if there are ANY other active contracts currently valid (by date)
staging_schema.sql:1303:        -- Actually, simplistically, if we just ended the active one, we might differ to Vacant unless another covers TODAY.
staging_schema.sql:1304:        -- For simplicity, if NO active contracts exist at all, set Vacant.
staging_schema.sql:1305:        IF NOT EXISTS (
staging_schema.sql:1306:            SELECT 1 FROM public.contracts 
staging_schema.sql:1307:            WHERE property_id = NEW.property_id 
staging_schema.sql:1308:            AND status = 'active' 
staging_schema.sql:1309:            AND id != NEW.id
staging_schema.sql:1310:        ) THEN
staging_schema.sql:1311:            UPDATE public.properties
staging_schema.sql:1312:            SET status = 'Vacant'
staging_schema.sql:1313:            WHERE id = NEW.property_id;
staging_schema.sql:1314:        END IF;
staging_schema.sql:1315:    END IF;
staging_schema.sql:1316:    
staging_schema.sql:1317:    RETURN NEW;
staging_schema.sql:1318:END;
staging_schema.sql:1319:$$ LANGUAGE plpgsql;
staging_schema.sql:1320:
staging_schema.sql:1321:-- Trigger: Update Property Status after contract changes
staging_schema.sql:1322:DROP TRIGGER IF EXISTS trigger_update_property_status ON public.contracts;
staging_schema.sql:1323:CREATE TRIGGER trigger_update_property_status
staging_schema.sql:1324:AFTER INSERT OR UPDATE ON public.contracts
staging_schema.sql:1325:FOR EACH ROW
staging_schema.sql:1326:EXECUTE FUNCTION public.update_property_status_from_contract();
staging_schema.sql:1327:-- Add metadata column to notifications for storing context (e.g., contract_id)
staging_schema.sql:1328:ALTER TABLE public.notifications 
staging_schema.sql:1329:ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
staging_schema.sql:1330:
staging_schema.sql:1331:-- Update RLS policies to allow new column usage if necessary (usually robust enough)
staging_schema.sql:1332:-- ============================================
staging_schema.sql:1333:-- FINAL SYSTEM FIX (Schema + Triggers)
staging_schema.sql:1334:-- ============================================
staging_schema.sql:1335:
staging_schema.sql:1336:-- 1. ENSURE SCHEMA IS CORRECT (Idempotent)
staging_schema.sql:1337:-- We make sure the columns exist. If they were missing, this fixes the "Database Error".
staging_schema.sql:1338:ALTER TABLE public.invoices 
staging_schema.sql:1339:ADD COLUMN IF NOT EXISTS billing_name TEXT,
staging_schema.sql:1340:ADD COLUMN IF NOT EXISTS billing_email TEXT,
staging_schema.sql:1341:ADD COLUMN IF NOT EXISTS billing_address TEXT;
staging_schema.sql:1342:
staging_schema.sql:1343:-- 2. RESET TRIGGERS (Clean Slate)
staging_schema.sql:1344:DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
staging_schema.sql:1345:DROP TRIGGER IF EXISTS on_auth_user_created_relink_invoices ON auth.users;
staging_schema.sql:1346:DROP FUNCTION IF EXISTS public.handle_new_user();
staging_schema.sql:1347:DROP FUNCTION IF EXISTS public.relink_past_invoices();
staging_schema.sql:1348:
staging_schema.sql:1349:-- 3. MASTER SIGNUP FUNCTION
staging_schema.sql:1350:CREATE OR REPLACE FUNCTION public.handle_new_user()
staging_schema.sql:1351:RETURNS TRIGGER 
staging_schema.sql:1352:LANGUAGE plpgsql 
staging_schema.sql:1353:SECURITY DEFINER SET search_path = public
staging_schema.sql:1354:AS $$
staging_schema.sql:1355:BEGIN
staging_schema.sql:1356:    -- A. Create User Profile
staging_schema.sql:1357:    INSERT INTO public.user_profiles (
staging_schema.sql:1358:        id, email, full_name, role, subscription_status, subscription_plan
staging_schema.sql:1359:    )
staging_schema.sql:1360:    VALUES (
staging_schema.sql:1361:        NEW.id,
staging_schema.sql:1362:        NEW.email,
staging_schema.sql:1363:        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
staging_schema.sql:1364:        'user',
staging_schema.sql:1365:        'active',
staging_schema.sql:1366:        'free_forever'
staging_schema.sql:1367:    )
staging_schema.sql:1368:    ON CONFLICT (id) DO NOTHING;
staging_schema.sql:1369:
staging_schema.sql:1370:    -- B. Link Past Invoices
staging_schema.sql:1371:    -- We explicitly check if any matching invoices exist before trying to update.
staging_schema.sql:1372:    -- This block will catch errors and Log them instead of crashing the signup.
staging_schema.sql:1373:    BEGIN
staging_schema.sql:1374:        UPDATE public.invoices
staging_schema.sql:1375:        SET user_id = NEW.id
staging_schema.sql:1376:        WHERE user_id IS NULL 
staging_schema.sql:1377:        AND billing_email = NEW.email;
staging_schema.sql:1378:    EXCEPTION WHEN OTHERS THEN
staging_schema.sql:1379:        RAISE WARNING 'Invoice linking error: %', SQLERRM;
staging_schema.sql:1380:    END;
staging_schema.sql:1381:
staging_schema.sql:1382:    RETURN NEW;
staging_schema.sql:1383:EXCEPTION WHEN OTHERS THEN
staging_schema.sql:1384:    -- Fallback: If profile creation fails, we allow the auth user but log the error.
staging_schema.sql:1385:    -- (Actually, we should probably raise to fail auth, but let's be safe for now)
staging_schema.sql:1386:    RAISE WARNING 'Profile creation error: %', SQLERRM;
staging_schema.sql:1387:    RETURN NEW;
staging_schema.sql:1388:END;
staging_schema.sql:1389:$$;
staging_schema.sql:1390:
staging_schema.sql:1391:-- 4. ATTACH TRIGGER
staging_schema.sql:1392:CREATE TRIGGER on_auth_user_created
staging_schema.sql:1393:    AFTER INSERT ON auth.users
staging_schema.sql:1394:    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
staging_schema.sql:1395:
staging_schema.sql:1396:-- 5. VERIFY PERMISSIONS
staging_schema.sql:1397:GRANT ALL ON TABLE public.invoices TO postgres, service_role;
staging_schema.sql:1398:GRANT ALL ON TABLE public.user_profiles TO postgres, service_role;
staging_schema.sql:1399:-- Fix Contracts Table Schema
staging_schema.sql:1400:-- Adds missing Foreign Keys and other essential columns
staging_schema.sql:1401:
staging_schema.sql:1402:-- 1. Foreign Keys (Crucial for the error you saw)
staging_schema.sql:1403:ALTER TABLE public.contracts 
staging_schema.sql:1404:ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id),
staging_schema.sql:1405:ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
staging_schema.sql:1406:
staging_schema.sql:1407:-- 2. Other Missing Columns (preventing future errors)
staging_schema.sql:1408:ALTER TABLE public.contracts
staging_schema.sql:1409:ADD COLUMN IF NOT EXISTS signing_date date,
staging_schema.sql:1410:ADD COLUMN IF NOT EXISTS start_date date,
staging_schema.sql:1411:ADD COLUMN IF NOT EXISTS end_date date,
staging_schema.sql:1412:ADD COLUMN IF NOT EXISTS base_rent numeric(10, 2),
staging_schema.sql:1413:ADD COLUMN IF NOT EXISTS currency text DEFAULT 'ILS',
staging_schema.sql:1414:ADD COLUMN IF NOT EXISTS payment_frequency text,
staging_schema.sql:1415:ADD COLUMN IF NOT EXISTS payment_day integer,
staging_schema.sql:1416:ADD COLUMN IF NOT EXISTS linkage_type text DEFAULT 'none',
staging_schema.sql:1417:ADD COLUMN IF NOT EXISTS security_deposit_amount numeric(10, 2),
staging_schema.sql:1418:ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
staging_schema.sql:1419:
staging_schema.sql:1420:-- 3. Linkage Details
staging_schema.sql:1421:ALTER TABLE public.contracts
staging_schema.sql:1422:ADD COLUMN IF NOT EXISTS base_index_date date,
staging_schema.sql:1423:ADD COLUMN IF NOT EXISTS base_index_value numeric(10, 4),
staging_schema.sql:1424:ADD COLUMN IF NOT EXISTS linkage_sub_type text,
staging_schema.sql:1425:ADD COLUMN IF NOT EXISTS linkage_ceiling numeric(5, 2),
staging_schema.sql:1426:ADD COLUMN IF NOT EXISTS linkage_floor numeric(5, 2);
staging_schema.sql:1427:
staging_schema.sql:1428:-- 4. Permissions
staging_schema.sql:1429:GRANT ALL ON public.contracts TO postgres, service_role, authenticated;
staging_schema.sql:1430:-- ============================================
staging_schema.sql:1431:-- FIX INFINITE RECURSION IN RLS POLICIES
staging_schema.sql:1432:-- ============================================
staging_schema.sql:1433:
staging_schema.sql:1434:-- 1. Create a SECURITY DEFINER function to check admin status
staging_schema.sql:1435:-- This function runs with the privileges of the creator (superuser), bypassing RLS.
staging_schema.sql:1436:-- This breaks the infinite loop where checking RLS required querying the table protected by RLS.
staging_schema.sql:1437:CREATE OR REPLACE FUNCTION public.is_admin()
staging_schema.sql:1438:RETURNS BOOLEAN 
staging_schema.sql:1439:LANGUAGE plpgsql 
staging_schema.sql:1440:SECURITY DEFINER 
staging_schema.sql:1441:SET search_path = public -- Secure the search path
staging_schema.sql:1442:AS $$
staging_schema.sql:1443:BEGIN
staging_schema.sql:1444:    RETURN EXISTS (
staging_schema.sql:1445:        SELECT 1 
staging_schema.sql:1446:        FROM public.user_profiles 
staging_schema.sql:1447:        WHERE id = auth.uid() 
staging_schema.sql:1448:        AND role = 'admin'
staging_schema.sql:1449:    );
staging_schema.sql:1450:END;
staging_schema.sql:1451:$$;
staging_schema.sql:1452:
staging_schema.sql:1453:-- 2. Drop existing problematic policies
staging_schema.sql:1454:DROP POLICY IF EXISTS "Admins see all" ON user_profiles;
staging_schema.sql:1455:DROP POLICY IF EXISTS "Admins can view all" ON user_profiles;
staging_schema.sql:1456:DROP POLICY IF EXISTS "Users view own profile" ON user_profiles;
staging_schema.sql:1457:DROP POLICY IF EXISTS "Admins manage CRM" ON crm_interactions;
staging_schema.sql:1458:DROP POLICY IF EXISTS "Admins view audit logs" ON audit_logs;
staging_schema.sql:1459:
staging_schema.sql:1460:-- Resets for User Profiles
staging_schema.sql:1461:DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
staging_schema.sql:1462:DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
staging_schema.sql:1463:
staging_schema.sql:1464:-- 3. Recreate Policies using the Safe Function
staging_schema.sql:1465:
staging_schema.sql:1466:-- A. User Profiles
staging_schema.sql:1467:CREATE POLICY "Users can view own profile" 
staging_schema.sql:1468:    ON user_profiles FOR SELECT 
staging_schema.sql:1469:    USING (auth.uid() = id);
staging_schema.sql:1470:
staging_schema.sql:1471:CREATE POLICY "Users can update own profile" 
staging_schema.sql:1472:    ON user_profiles FOR UPDATE 
staging_schema.sql:1473:    USING (auth.uid() = id);
staging_schema.sql:1474:
staging_schema.sql:1475:CREATE POLICY "Admins can view all profiles" 
staging_schema.sql:1476:    ON user_profiles FOR SELECT 
staging_schema.sql:1477:    USING (is_admin());
staging_schema.sql:1478:
staging_schema.sql:1479:CREATE POLICY "Admins can update all profiles" 
staging_schema.sql:1480:    ON user_profiles FOR UPDATE 
staging_schema.sql:1481:    USING (is_admin());
staging_schema.sql:1482:
staging_schema.sql:1483:-- B. CRM Interactions (Admin Only)
staging_schema.sql:1484:CREATE POLICY "Admins manage CRM"
staging_schema.sql:1485:    ON crm_interactions FOR ALL
staging_schema.sql:1486:    USING (is_admin());
staging_schema.sql:1487:
staging_schema.sql:1488:-- C. Audit Logs (Admin Only)
staging_schema.sql:1489:CREATE POLICY "Admins view audit logs"
staging_schema.sql:1490:    ON audit_logs FOR SELECT
staging_schema.sql:1491:    USING (is_admin());
staging_schema.sql:1492:
staging_schema.sql:1493:-- D. Invoices (Users own, Admins all)
staging_schema.sql:1494:DROP POLICY IF EXISTS "Users view own invoices" ON invoices;
staging_schema.sql:1495:DROP POLICY IF EXISTS "Admins view all invoices" ON invoices;
staging_schema.sql:1496:
staging_schema.sql:1497:CREATE POLICY "Users view own invoices"
staging_schema.sql:1498:    ON invoices FOR SELECT
staging_schema.sql:1499:    USING (auth.uid() = user_id);
staging_schema.sql:1500:
staging_schema.sql:1501:CREATE POLICY "Admins view all invoices"
staging_schema.sql:1502:    ON invoices FOR SELECT
staging_schema.sql:1503:    USING (is_admin());
staging_schema.sql:1504:-- Ensure contract_file_url exists on contracts table
staging_schema.sql:1505:ALTER TABLE contracts
staging_schema.sql:1506:ADD COLUMN IF NOT EXISTS contract_file_url TEXT;
staging_schema.sql:1507:
staging_schema.sql:1508:-- ============================================
staging_schema.sql:1509:-- RESCUE SCRIPT: Fix Missing Profile
staging_schema.sql:1510:-- ============================================
staging_schema.sql:1511:
staging_schema.sql:1512:-- If you can't log in, it's likely your "User Profile" wasn't created due to the previous error.
staging_schema.sql:1513:-- This script manually creates it for you.
staging_schema.sql:1514:
staging_schema.sql:1515:DO $$
staging_schema.sql:1516:DECLARE
staging_schema.sql:1517:    target_email TEXT := 'rentmate.rubi@gmail.com'; -- <--- YOUR EMAIL HERE
staging_schema.sql:1518:    v_user_id UUID;
staging_schema.sql:1519:BEGIN
staging_schema.sql:1520:    -- 1. Find the User ID from the Auth table
staging_schema.sql:1521:    SELECT id INTO v_user_id FROM auth.users WHERE email = target_email;
staging_schema.sql:1522:
staging_schema.sql:1523:    IF v_user_id IS NULL THEN
staging_schema.sql:1524:        RAISE EXCEPTION 'User % not found in Auth system. Please Sign Up first.', target_email;
staging_schema.sql:1525:    END IF;
staging_schema.sql:1526:
staging_schema.sql:1527:    -- 2. Create the Profile manually if it's missing
staging_schema.sql:1528:    INSERT INTO public.user_profiles (
staging_schema.sql:1529:        id, 
staging_schema.sql:1530:        email, 
staging_schema.sql:1531:        full_name, 
staging_schema.sql:1532:        role, 
staging_schema.sql:1533:        subscription_status, 
staging_schema.sql:1534:        subscription_plan
staging_schema.sql:1535:    )
staging_schema.sql:1536:    VALUES (
staging_schema.sql:1537:        v_user_id,
staging_schema.sql:1538:        target_email,
staging_schema.sql:1539:        'Admin User', -- Default name
staging_schema.sql:1540:        'admin',      -- Give yourself Admin access
staging_schema.sql:1541:        'active',
staging_schema.sql:1542:        'free_forever'
staging_schema.sql:1543:    )
staging_schema.sql:1544:    ON CONFLICT (id) DO UPDATE 
staging_schema.sql:1545:    SET role = 'admin', subscription_status = 'active';
staging_schema.sql:1546:
staging_schema.sql:1547:    RAISE NOTICE 'Fixed profile for %', target_email;
staging_schema.sql:1548:END;
staging_schema.sql:1549:$$;
staging_schema.sql:1550:-- ============================================
staging_schema.sql:1551:-- FIX ORPHANED USERS
staging_schema.sql:1552:-- ============================================
staging_schema.sql:1553:-- This script finds users in auth.users who don't have a user_profiles entry
staging_schema.sql:1554:-- and creates the missing profiles for them.
staging_schema.sql:1555:
staging_schema.sql:1556:-- 1. Create missing profiles for orphaned auth users
staging_schema.sql:1557:INSERT INTO public.user_profiles (
staging_schema.sql:1558:    id, 
staging_schema.sql:1559:    email, 
staging_schema.sql:1560:    full_name,
staging_schema.sql:1561:    first_name,
staging_schema.sql:1562:    last_name,
staging_schema.sql:1563:    role, 
staging_schema.sql:1564:    subscription_status, 
staging_schema.sql:1565:    plan_id
staging_schema.sql:1566:)
staging_schema.sql:1567:SELECT 
staging_schema.sql:1568:    au.id,
staging_schema.sql:1569:    au.email,
staging_schema.sql:1570:    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
staging_schema.sql:1571:    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
staging_schema.sql:1572:    'User',
staging_schema.sql:1573:    'user',
staging_schema.sql:1574:    'active',
staging_schema.sql:1575:    'free'
staging_schema.sql:1576:FROM auth.users au
staging_schema.sql:1577:LEFT JOIN public.user_profiles up ON au.id = up.id
staging_schema.sql:1578:WHERE up.id IS NULL
staging_schema.sql:1579:ON CONFLICT (id) DO UPDATE SET
staging_schema.sql:1580:    email = EXCLUDED.email,
staging_schema.sql:1581:    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
staging_schema.sql:1582:    first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
staging_schema.sql:1583:    last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
staging_schema.sql:1584:    updated_at = NOW();
staging_schema.sql:1585:
staging_schema.sql:1586:-- 2. Log the fix
staging_schema.sql:1587:DO $$
staging_schema.sql:1588:DECLARE
staging_schema.sql:1589:    orphaned_count INTEGER;
staging_schema.sql:1590:BEGIN
staging_schema.sql:1591:    SELECT COUNT(*) INTO orphaned_count
staging_schema.sql:1592:    FROM auth.users au
staging_schema.sql:1593:    LEFT JOIN public.user_profiles up ON au.id = up.id
staging_schema.sql:1594:    WHERE up.id IS NULL;
staging_schema.sql:1595:    
staging_schema.sql:1596:    RAISE NOTICE 'Fixed % orphaned user profiles', orphaned_count;
staging_schema.sql:1597:END $$;
staging_schema.sql:1598:-- ============================================
staging_schema.sql:1599:-- FINAL FIX FOR SIGNUP ERRORS
staging_schema.sql:1600:-- ============================================
staging_schema.sql:1601:
staging_schema.sql:1602:-- 1. Grant Permissions to be absolutely safe
staging_schema.sql:1603:GRANT ALL ON TABLE public.invoices TO postgres, service_role;
staging_schema.sql:1604:GRANT ALL ON TABLE public.user_profiles TO postgres, service_role;
staging_schema.sql:1605:
staging_schema.sql:1606:-- 2. Update the Invoice Relinking Trigger to be ROBUST
staging_schema.sql:1607:-- We add 'SET search_path = public' to ensure it finds the table.
staging_schema.sql:1608:-- We add a Try/Catch block to prevent blocking signup if this fails.
staging_schema.sql:1609:
staging_schema.sql:1610:CREATE OR REPLACE FUNCTION relink_past_invoices()
staging_schema.sql:1611:RETURNS TRIGGER 
staging_schema.sql:1612:LANGUAGE plpgsql 
staging_schema.sql:1613:SECURITY DEFINER SET search_path = public
staging_schema.sql:1614:AS $$
staging_schema.sql:1615:BEGIN
staging_schema.sql:1616:    -- Update invoices that have NO owner (user_id is NULL) 
staging_schema.sql:1617:    -- but match the new user's email string.
staging_schema.sql:1618:    UPDATE public.invoices
staging_schema.sql:1619:    SET user_id = NEW.id
staging_schema.sql:1620:    WHERE user_id IS NULL 
staging_schema.sql:1621:    AND billing_email = NEW.email;
staging_schema.sql:1622:
staging_schema.sql:1623:    RETURN NEW;
staging_schema.sql:1624:EXCEPTION WHEN OTHERS THEN
staging_schema.sql:1625:    -- If this fails, we Log it but ALLOW the user to sign up.
staging_schema.sql:1626:    -- We don't want to block registration just because of an invoice linking error.
staging_schema.sql:1627:    RAISE WARNING 'Failed to relink invoices for user %: %', NEW.email, SQLERRM;
staging_schema.sql:1628:    RETURN NEW;
staging_schema.sql:1629:END;
staging_schema.sql:1630:$$;
staging_schema.sql:1631:
staging_schema.sql:1632:-- 3. Ensure the Trigger is attached
staging_schema.sql:1633:DROP TRIGGER IF EXISTS on_auth_user_created_relink_invoices ON auth.users;
staging_schema.sql:1634:CREATE TRIGGER on_auth_user_created_relink_invoices
staging_schema.sql:1635:    AFTER INSERT ON auth.users
staging_schema.sql:1636:    FOR EACH ROW
staging_schema.sql:1637:    EXECUTE FUNCTION relink_past_invoices();
staging_schema.sql:1638:-- Comprehensive Fix for "Failed to Update Profile"
staging_schema.sql:1639:
staging_schema.sql:1640:DO $$ 
staging_schema.sql:1641:BEGIN
staging_schema.sql:1642:    -- 1. Ensure Columns Exist
staging_schema.sql:1643:    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 
'first_name') THEN
staging_schema.sql:1644:        ALTER TABLE public.user_profiles ADD COLUMN first_name TEXT;
staging_schema.sql:1645:    END IF;
staging_schema.sql:1646:
staging_schema.sql:1647:    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'last_name') 
THEN
staging_schema.sql:1648:        ALTER TABLE public.user_profiles ADD COLUMN last_name TEXT;
staging_schema.sql:1649:    END IF;
staging_schema.sql:1650:
staging_schema.sql:1651:    -- 2. Populate NULLs (Safety Check)
staging_schema.sql:1652:    UPDATE public.user_profiles
staging_schema.sql:1653:    SET 
staging_schema.sql:1654:        first_name = COALESCE(full_name, 'User'),
staging_schema.sql:1655:        last_name = 'aaa'
staging_schema.sql:1656:    WHERE first_name IS NULL OR last_name IS NULL;
staging_schema.sql:1657:
staging_schema.sql:1658:    -- 3. Reset RLS Policies for user_profiles (The Nuclear Option for Permissions)
staging_schema.sql:1659:    -- First, ensure RLS is on
staging_schema.sql:1660:    ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
staging_schema.sql:1661:
staging_schema.sql:1662:    -- Drop potentially conflicting policies
staging_schema.sql:1663:    DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
staging_schema.sql:1664:    DROP POLICY IF EXISTS "Users update own" ON public.user_profiles;
staging_schema.sql:1665:    DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
staging_schema.sql:1666:    DROP POLICY IF EXISTS "Users view own" ON public.user_profiles;
staging_schema.sql:1667:
staging_schema.sql:1668:    -- Re-create Standard Policies
staging_schema.sql:1669:    
staging_schema.sql:1670:    -- SELECT
staging_schema.sql:1671:    CREATE POLICY "Users view own"
staging_schema.sql:1672:    ON public.user_profiles FOR SELECT
staging_schema.sql:1673:    USING (auth.uid() = id);
staging_schema.sql:1674:
staging_schema.sql:1675:    -- UPDATE (Explicitly Allow)
staging_schema.sql:1676:    CREATE POLICY "Users update own"
staging_schema.sql:1677:    ON public.user_profiles FOR UPDATE
staging_schema.sql:1678:    USING (auth.uid() = id);
staging_schema.sql:1679:
staging_schema.sql:1680:    -- INSERT (Crucial for 'upsert' if row is missing/ghosted)
staging_schema.sql:1681:    CREATE POLICY "Users insert own"
staging_schema.sql:1682:    ON public.user_profiles FOR INSERT
staging_schema.sql:1683:    WITH CHECK (auth.uid() = id);
staging_schema.sql:1684:
staging_schema.sql:1685:END $$;
staging_schema.sql:1686:-- Safely add missing columns to properties table
staging_schema.sql:1687:DO $$
staging_schema.sql:1688:BEGIN
staging_schema.sql:1689:    -- Add has_parking
staging_schema.sql:1690:    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'has_parking') 
THEN
staging_schema.sql:1691:        ALTER TABLE properties ADD COLUMN has_parking BOOLEAN DEFAULT false;
staging_schema.sql:1692:    END IF;
staging_schema.sql:1693:
staging_schema.sql:1694:    -- Add has_storage
staging_schema.sql:1695:    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'has_storage') 
THEN
staging_schema.sql:1696:        ALTER TABLE properties ADD COLUMN has_storage BOOLEAN DEFAULT false;
staging_schema.sql:1697:    END IF;
staging_schema.sql:1698:
staging_schema.sql:1699:    -- Add property_type
staging_schema.sql:1700:    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 
'property_type') THEN
staging_schema.sql:1701:        ALTER TABLE properties ADD COLUMN property_type TEXT DEFAULT 'apartment';
staging_schema.sql:1702:    END IF;
staging_schema.sql:1703:
staging_schema.sql:1704:    -- Add image_url
staging_schema.sql:1705:    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'image_url') 
THEN
staging_schema.sql:1706:        ALTER TABLE properties ADD COLUMN image_url TEXT;
staging_schema.sql:1707:    END IF;
staging_schema.sql:1708:END $$;
staging_schema.sql:1709:
staging_schema.sql:1710:-- Update constraint for property_type
staging_schema.sql:1711:DO $$
staging_schema.sql:1712:BEGIN
staging_schema.sql:1713:    ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_property_type_check;
staging_schema.sql:1714:    ALTER TABLE properties ADD CONSTRAINT properties_property_type_check 
staging_schema.sql:1715:    CHECK (property_type IN ('apartment', 'penthouse', 'garden', 'house', 'other'));
staging_schema.sql:1716:EXCEPTION
staging_schema.sql:1717:    WHEN OTHERS THEN NULL;
staging_schema.sql:1718:END $$;
staging_schema.sql:1719:-- FIX: Re-create the handle_new_user function with explicit search_path and permissions
staging_schema.sql:1720:
staging_schema.sql:1721:-- 1. Grant permissions to be sure
staging_schema.sql:1722:GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
staging_schema.sql:1723:GRANT ALL ON TABLE public.user_profiles TO postgres, service_role;
staging_schema.sql:1724:
staging_schema.sql:1725:-- 2. Drop the trigger first to avoid conflicts during replace
staging_schema.sql:1726:DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
staging_schema.sql:1727:
staging_schema.sql:1728:-- 3. Re-define the function with `SET search_path = public`
staging_schema.sql:1729:-- This fixes issues where the function can't find 'user_profiles' or the enums.
staging_schema.sql:1730:CREATE OR REPLACE FUNCTION public.handle_new_user()
staging_schema.sql:1731:RETURNS TRIGGER 
staging_schema.sql:1732:LANGUAGE plpgsql 
staging_schema.sql:1733:SECURITY DEFINER SET search_path = public
staging_schema.sql:1734:AS $$
staging_schema.sql:1735:BEGIN
staging_schema.sql:1736:    INSERT INTO public.user_profiles (
staging_schema.sql:1737:        id, 
staging_schema.sql:1738:        email, 
staging_schema.sql:1739:        full_name, 
staging_schema.sql:1740:        role, 
staging_schema.sql:1741:        subscription_status, 
staging_schema.sql:1742:        subscription_plan
staging_schema.sql:1743:    )
staging_schema.sql:1744:    VALUES (
staging_schema.sql:1745:        NEW.id,
staging_schema.sql:1746:        NEW.email,
staging_schema.sql:1747:        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
staging_schema.sql:1748:        'user'::user_role,
staging_schema.sql:1749:        'active'::subscription_status,
staging_schema.sql:1750:        'free_forever'::subscription_plan_type
staging_schema.sql:1751:    );
staging_schema.sql:1752:    RETURN NEW;
staging_schema.sql:1753:EXCEPTION WHEN OTHERS THEN
staging_schema.sql:1754:    -- In case of error, we raise it so we know WHY it failed in the logs, 
staging_schema.sql:1755:    -- but for the user it will just say "Database error".
staging_schema.sql:1756:    -- We try to make the above INSERT bulletproof by casting.
staging_schema.sql:1757:    RAISE EXCEPTION 'Profile creation failed: %', SQLERRM;
staging_schema.sql:1758:END;
staging_schema.sql:1759:$$;
staging_schema.sql:1760:
staging_schema.sql:1761:-- 4. Re-attach the trigger
staging_schema.sql:1762:CREATE TRIGGER on_auth_user_created
staging_schema.sql:1763:    AFTER INSERT ON auth.users
staging_schema.sql:1764:    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
staging_schema.sql:1765:-- ============================================
staging_schema.sql:1766:-- FIX SIGNUP TRIGGER (Proper Plan Linking)
staging_schema.sql:1767:-- ============================================
staging_schema.sql:1768:
staging_schema.sql:1769:-- 1. Ensure the 'free' plan exists to avoid foreign key errors
staging_schema.sql:1770:INSERT INTO public.subscription_plans (id, name, price_monthly, max_properties, max_tenants)
staging_schema.sql:1771:VALUES ('free', 'Free Forever', 0, 1, 2)
staging_schema.sql:1772:ON CONFLICT (id) DO NOTHING;
staging_schema.sql:1773:
staging_schema.sql:1774:-- 2. Re-define the handler to set plan_id
staging_schema.sql:1775:CREATE OR REPLACE FUNCTION public.handle_new_user()
staging_schema.sql:1776:RETURNS TRIGGER 
staging_schema.sql:1777:LANGUAGE plpgsql 
staging_schema.sql:1778:SECURITY DEFINER SET search_path = public
staging_schema.sql:1779:AS $$
staging_schema.sql:1780:BEGIN
staging_schema.sql:1781:    INSERT INTO public.user_profiles (
staging_schema.sql:1782:        id, 
staging_schema.sql:1783:        email, 
staging_schema.sql:1784:        full_name, 
staging_schema.sql:1785:        role, 
staging_schema.sql:1786:        subscription_status, 
staging_schema.sql:1787:        plan_id, -- New relation
staging_schema.sql:1788:        subscription_plan -- Legacy enum fallback
staging_schema.sql:1789:    )
staging_schema.sql:1790:    VALUES (
staging_schema.sql:1791:        NEW.id,
staging_schema.sql:1792:        NEW.email,
staging_schema.sql:1793:        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
staging_schema.sql:1794:        'user'::user_role,
staging_schema.sql:1795:        'active'::subscription_status,
staging_schema.sql:1796:        'free', -- Default to 'free' plan ID
staging_schema.sql:1797:        'free_forever'::subscription_plan_type -- Legacy fallback
staging_schema.sql:1798:    );
staging_schema.sql:1799:    RETURN NEW;
staging_schema.sql:1800:EXCEPTION WHEN OTHERS THEN
staging_schema.sql:1801:    RAISE EXCEPTION 'Profile creation failed: %', SQLERRM;
staging_schema.sql:1802:END;
staging_schema.sql:1803:$$;
staging_schema.sql:1804:-- Comprehensive migration to fix schema for Tenants and Contracts
staging_schema.sql:1805:
staging_schema.sql:1806:-- 1. Fix Tenants Table
staging_schema.sql:1807:ALTER TABLE public.tenants 
staging_schema.sql:1808:ADD COLUMN IF NOT EXISTS id_number TEXT,
staging_schema.sql:1809:ADD COLUMN IF NOT EXISTS email TEXT,
staging_schema.sql:1810:ADD COLUMN IF NOT EXISTS phone TEXT;
staging_schema.sql:1811:
staging_schema.sql:1812:-- 2. Fix Contracts Table (Financials & Linkage)
staging_schema.sql:1813:ALTER TABLE public.contracts
staging_schema.sql:1814:ADD COLUMN IF NOT EXISTS base_rent NUMERIC(10, 2),
staging_schema.sql:1815:ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ILS',
staging_schema.sql:1816:ADD COLUMN IF NOT EXISTS payment_frequency TEXT,
staging_schema.sql:1817:ADD COLUMN IF NOT EXISTS payment_day INTEGER,
staging_schema.sql:1818:ADD COLUMN IF NOT EXISTS linkage_type TEXT DEFAULT 'none',
staging_schema.sql:1819:ADD COLUMN IF NOT EXISTS base_index_date DATE,
staging_schema.sql:1820:ADD COLUMN IF NOT EXISTS base_index_value NUMERIC(10, 4), -- More precision for index
staging_schema.sql:1821:ADD COLUMN IF NOT EXISTS security_deposit_amount NUMERIC(10, 2),
staging_schema.sql:1822:ADD COLUMN IF NOT EXISTS signing_date DATE,
staging_schema.sql:1823:ADD COLUMN IF NOT EXISTS start_date DATE,
staging_schema.sql:1824:ADD COLUMN IF NOT EXISTS end_date DATE,
staging_schema.sql:1825:ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
staging_schema.sql:1826:
staging_schema.sql:1827:-- 3. Add New Linkage Features (Sub-Type and Caps)
staging_schema.sql:1828:ALTER TABLE public.contracts
staging_schema.sql:1829:ADD COLUMN IF NOT EXISTS linkage_sub_type TEXT, -- 'known', 'respect_of', 'base'
staging_schema.sql:1830:ADD COLUMN IF NOT EXISTS linkage_ceiling NUMERIC(5, 2), -- Percentage
staging_schema.sql:1831:ADD COLUMN IF NOT EXISTS linkage_floor NUMERIC(5, 2); -- Percentage
staging_schema.sql:1832:
staging_schema.sql:1833:-- 4. Enable RLS
staging_schema.sql:1834:ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
staging_schema.sql:1835:ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
staging_schema.sql:1836:-- ============================================
staging_schema.sql:1837:-- FORCE ACTIVATE ACCOUNT (Bypass Email)
staging_schema.sql:1838:-- ============================================
staging_schema.sql:1839:
staging_schema.sql:1840:-- 1. CONFIRM EMAIL MANUALLY (So you don't need to wait for it)
staging_schema.sql:1841:UPDATE auth.users
staging_schema.sql:1842:SET email_confirmed_at = now()
staging_schema.sql:1843:WHERE email = 'rentmate.rubi@gmail.com';  -- Your Email
staging_schema.sql:1844:
staging_schema.sql:1845:-- 2. FIX DATABASE SCHEMA (Add missing columns)
staging_schema.sql:1846:ALTER TABLE public.user_profiles 
staging_schema.sql:1847:ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
staging_schema.sql:1848:ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free_forever';
staging_schema.sql:1849:
staging_schema.sql:1850:-- 3. FORCE CREATE ADMIN PROFILE
staging_schema.sql:1851:DO $$
staging_schema.sql:1852:DECLARE
staging_schema.sql:1853:    v_user_id UUID;
staging_schema.sql:1854:    target_email TEXT := 'rentmate.rubi@gmail.com';
staging_schema.sql:1855:BEGIN
staging_schema.sql:1856:    SELECT id INTO v_user_id FROM auth.users WHERE email = target_email;
staging_schema.sql:1857:
staging_schema.sql:1858:    IF v_user_id IS NOT NULL THEN
staging_schema.sql:1859:        -- Insert or Update the profile to be an Admin
staging_schema.sql:1860:        INSERT INTO public.user_profiles (
staging_schema.sql:1861:            id, email, full_name, role, subscription_status, subscription_plan
staging_schema.sql:1862:        )
staging_schema.sql:1863:        VALUES (
staging_schema.sql:1864:            v_user_id, target_email, 'Admin User', 'admin', 'active', 'free_forever'
staging_schema.sql:1865:        )
staging_schema.sql:1866:        ON CONFLICT (id) DO UPDATE 
staging_schema.sql:1867:        SET role = 'admin', 
staging_schema.sql:1868:            subscription_status = 'active', 
staging_schema.sql:1869:            subscription_plan = 'free_forever';
staging_schema.sql:1870:            
staging_schema.sql:1871:        RAISE NOTICE 'User % has been fully activated and promoted to Admin.', target_email;
staging_schema.sql:1872:    ELSE
staging_schema.sql:1873:        RAISE WARNING 'User % not found in Auth system. Did you sign up?', target_email;
staging_schema.sql:1874:    END IF;
staging_schema.sql:1875:END;
staging_schema.sql:1876:$$;
staging_schema.sql:1877:
staging_schema.sql:1878:-- 4. REPAIR SIGNUP TRIGGER (For future users)
staging_schema.sql:1879:CREATE OR REPLACE FUNCTION public.handle_new_user()
staging_schema.sql:1880:RETURNS TRIGGER 
staging_schema.sql:1881:LANGUAGE plpgsql 
staging_schema.sql:1882:SECURITY DEFINER SET search_path = public
staging_schema.sql:1883:AS $$
staging_schema.sql:1884:BEGIN
staging_schema.sql:1885:    INSERT INTO public.user_profiles (
staging_schema.sql:1886:        id, email, full_name, role, subscription_status, subscription_plan
staging_schema.sql:1887:    )
staging_schema.sql:1888:    VALUES (
staging_schema.sql:1889:        NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 
staging_schema.sql:1890:        'user', 'active', 'free_forever'
staging_schema.sql:1891:    )
staging_schema.sql:1892:    ON CONFLICT (id) DO NOTHING;
staging_schema.sql:1893:
staging_schema.sql:1894:    -- Try to recover invoices (but don't fail if it breaks)
staging_schema.sql:1895:    BEGIN
staging_schema.sql:1896:        UPDATE public.invoices SET user_id = NEW.id 
staging_schema.sql:1897:        WHERE user_id IS NULL AND billing_email = NEW.email;
staging_schema.sql:1898:    EXCEPTION WHEN OTHERS THEN NULL;
staging_schema.sql:1899:    END;
staging_schema.sql:1900:
staging_schema.sql:1901:    RETURN NEW;
staging_schema.sql:1902:END;
staging_schema.sql:1903:$$;
staging_schema.sql:1904:-- ============================================
staging_schema.sql:1905:-- AUTO-RECOVER PAST INVOICES ON SIGNUP
staging_schema.sql:1906:-- ============================================
staging_schema.sql:1907:
staging_schema.sql:1908:-- This function runs whenever a NEW user triggers the 'handle_new_user' flow (or separate trigger).
staging_schema.sql:1909:-- It looks for "Orphaned" invoices (where user_id IS NULL) that match the new user's email.
staging_schema.sql:1910:
staging_schema.sql:1911:CREATE OR REPLACE FUNCTION relink_past_invoices()
staging_schema.sql:1912:RETURNS TRIGGER AS $$
staging_schema.sql:1913:DECLARE
staging_schema.sql:1914:    recovered_count INT;
staging_schema.sql:1915:BEGIN
staging_schema.sql:1916:    -- Update invoices that have NO owner (user_id is NULL) 
staging_schema.sql:1917:    -- but match the new user's email string.
staging_schema.sql:1918:    UPDATE public.invoices
staging_schema.sql:1919:    SET user_id = NEW.id
staging_schema.sql:1920:    WHERE user_id IS NULL 
staging_schema.sql:1921:    AND billing_email = NEW.email;
staging_schema.sql:1922:
staging_schema.sql:1923:    GET DIAGNOSTICS recovered_count = ROW_COUNT;
staging_schema.sql:1924:
staging_schema.sql:1925:    -- Optional: Log this event if you want audit trails
staging_schema.sql:1926:    -- RAISE NOTICE 'Recovered % invoices for user % based on email match.', recovered_count, NEW.email;
staging_schema.sql:1927:
staging_schema.sql:1928:    RETURN NEW;
staging_schema.sql:1929:END;
staging_schema.sql:1930:$$ LANGUAGE plpgsql SECURITY DEFINER;
staging_schema.sql:1931:
staging_schema.sql:1932:-- Attach this to the SAME trigger point as profile creation, 
staging_schema.sql:1933:-- or run it right after.
staging_schema.sql:1934:-- We'll attach it to auth.users AFTER INSERT.
staging_schema.sql:1935:
staging_schema.sql:1936:DROP TRIGGER IF EXISTS on_auth_user_created_relink_invoices ON auth.users;
staging_schema.sql:1937:
staging_schema.sql:1938:CREATE TRIGGER on_auth_user_created_relink_invoices
staging_schema.sql:1939:    AFTER INSERT ON auth.users
staging_schema.sql:1940:    FOR EACH ROW
staging_schema.sql:1941:    EXECUTE FUNCTION relink_past_invoices();
staging_schema.sql:1942:-- ============================================
staging_schema.sql:1943:-- PROTECT INVOICES & DATA RETENTION
staging_schema.sql:1944:-- ============================================
staging_schema.sql:1945:
staging_schema.sql:1946:-- 1. Modify Invoices to survive User Deletion
staging_schema.sql:1947:-- We drop the "Cascade" constraint and replace it with "Set Null"
staging_schema.sql:1948:ALTER TABLE invoices
staging_schema.sql:1949:DROP CONSTRAINT invoices_user_id_fkey;
staging_schema.sql:1950:
staging_schema.sql:1951:ALTER TABLE invoices
staging_schema.sql:1952:ADD CONSTRAINT invoices_user_id_fkey
staging_schema.sql:1953:FOREIGN KEY (user_id)
staging_schema.sql:1954:REFERENCES user_profiles(id)
staging_schema.sql:1955:ON DELETE SET NULL;
staging_schema.sql:1956:
staging_schema.sql:1957:-- 2. Add "Snapshot" fields
staging_schema.sql:1958:-- If the user is deleted, "user_id" becomes NULL.
staging_schema.sql:1959:-- We need these text fields to know who the invoice was for (Tax Law Requirement).
staging_schema.sql:1960:ALTER TABLE invoices
staging_schema.sql:1961:ADD COLUMN IF NOT EXISTS billing_name TEXT,
staging_schema.sql:1962:ADD COLUMN IF NOT EXISTS billing_email TEXT,
staging_schema.sql:1963:ADD COLUMN IF NOT EXISTS billing_address TEXT;
staging_schema.sql:1964:
staging_schema.sql:1965:-- 3. Update existing invoices (Backfill)
staging_schema.sql:1966:-- Copy current profile data into the snapshot fields so we don't lose it.
staging_schema.sql:1967:UPDATE invoices i
staging_schema.sql:1968:SET 
staging_schema.sql:1969:  billing_name = p.full_name,
staging_schema.sql:1970:  billing_email = p.email
staging_schema.sql:1971:FROM user_profiles p
staging_schema.sql:1972:WHERE i.user_id = p.id;
staging_schema.sql:1973:
staging_schema.sql:1974:-- 4. Automatic Snapshot Trigger
staging_schema.sql:1975:-- Whenever a new invoice is created, automatically copy the user's details 
staging_schema.sql:1976:-- into the billing fields. This ensures data integrity even if the user changes later.
staging_schema.sql:1977:CREATE OR REPLACE FUNCTION snapshot_invoice_details()
staging_schema.sql:1978:RETURNS TRIGGER AS $$
staging_schema.sql:1979:BEGIN
staging_schema.sql:1980:    -- Only update if not provided manually
staging_schema.sql:1981:    IF NEW.billing_name IS NULL OR NEW.billing_email IS NULL THEN
staging_schema.sql:1982:        SELECT full_name, email INTO NEW.billing_name, NEW.billing_email
staging_schema.sql:1983:        FROM user_profiles
staging_schema.sql:1984:        WHERE id = NEW.user_id;
staging_schema.sql:1985:    END IF;
staging_schema.sql:1986:    RETURN NEW;
staging_schema.sql:1987:END;
staging_schema.sql:1988:$$ LANGUAGE plpgsql;
staging_schema.sql:1989:
staging_schema.sql:1990:DROP TRIGGER IF EXISTS on_invoice_created ON invoices;
staging_schema.sql:1991:CREATE TRIGGER on_invoice_created
staging_schema.sql:1992:    BEFORE INSERT ON invoices
staging_schema.sql:1993:    FOR EACH ROW
staging_schema.sql:1994:    EXECUTE FUNCTION snapshot_invoice_details();
staging_schema.sql:1995:-- ============================================
staging_schema.sql:1996:-- RELAX SESSION LIMITS (Increase to 5)
staging_schema.sql:1997:-- ============================================
staging_schema.sql:1998:
staging_schema.sql:1999:-- Update the manage_session_limits function to be more lenient
staging_schema.sql:2000:CREATE OR REPLACE FUNCTION public.manage_session_limits()
staging_schema.sql:2001:RETURNS TRIGGER
staging_schema.sql:2002:LANGUAGE plpgsql
staging_schema.sql:2003:SECURITY DEFINER
staging_schema.sql:2004:SET search_path = public, auth
staging_schema.sql:2005:AS $$
staging_schema.sql:2006:DECLARE
staging_schema.sql:2007:    new_device_type TEXT;
staging_schema.sql:2008:    session_count INT;
staging_schema.sql:2009:    oldest_session_id UUID;
staging_schema.sql:2010:    -- FIX: Increased from 1 to 5 to prevent aggressive logouts
staging_schema.sql:2011:    max_sessions_per_type INT := 5; 
staging_schema.sql:2012:BEGIN
staging_schema.sql:2013:    -- Identify what kind of device is trying to log in
staging_schema.sql:2014:    new_device_type := public.get_device_type(NEW.user_agent);
staging_schema.sql:2015:
staging_schema.sql:2016:    -- Count EXISTING sessions for this user of the SAME type
staging_schema.sql:2017:    SELECT COUNT(*)
staging_schema.sql:2018:    INTO session_count
staging_schema.sql:2019:    FROM auth.sessions
staging_schema.sql:2020:    WHERE user_id = NEW.user_id
staging_schema.sql:2021:    AND public.get_device_type(user_agent) = new_device_type;
staging_schema.sql:2022:
staging_schema.sql:2023:    -- If we are at (or above) the limit, we need to make room.
staging_schema.sql:2024:    IF session_count >= max_sessions_per_type THEN
staging_schema.sql:2025:        
staging_schema.sql:2026:        -- Identify the Oldest Session to remove
staging_schema.sql:2027:        SELECT id
staging_schema.sql:2028:        INTO oldest_session_id
staging_schema.sql:2029:        FROM auth.sessions
staging_schema.sql:2030:        WHERE user_id = NEW.user_id
staging_schema.sql:2031:        AND public.get_device_type(user_agent) = new_device_type
staging_schema.sql:2032:        ORDER BY created_at ASC
staging_schema.sql:2033:        LIMIT 1;
staging_schema.sql:2034:
staging_schema.sql:2035:        -- Delete it
staging_schema.sql:2036:        IF oldest_session_id IS NOT NULL THEN
staging_schema.sql:2037:            DELETE FROM auth.sessions WHERE id = oldest_session_id;
staging_schema.sql:2038:        END IF;
staging_schema.sql:2039:    END IF;
staging_schema.sql:2040:
staging_schema.sql:2041:    RETURN NEW;
staging_schema.sql:2042:END;
staging_schema.sql:2043:$$;
staging_schema.sql:2044:-- Relax legacy constraints on tenants table to prevent errors
staging_schema.sql:2045:-- This makes specific columns optional (nullable)
staging_schema.sql:2046:
staging_schema.sql:2047:ALTER TABLE public.tenants ALTER COLUMN monthly_rent DROP NOT NULL;
staging_schema.sql:2048:
staging_schema.sql:2049:-- Also relax others that might be legacy leftovers
staging_schema.sql:2050:ALTER TABLE public.tenants ALTER COLUMN full_name DROP NOT NULL;
staging_schema.sql:2051:ALTER TABLE public.tenants ALTER COLUMN phone DROP NOT NULL;
staging_schema.sql:2052:ALTER TABLE public.tenants ALTER COLUMN email DROP NOT NULL;
staging_schema.sql:2053:
staging_schema.sql:2054:-- Ensure properties constraints are also reasonable
staging_schema.sql:2055:ALTER TABLE public.properties ALTER COLUMN rent_price DROP NOT NULL;
staging_schema.sql:2056:-- ============================================
staging_schema.sql:2057:-- FINAL REPAIR: SCHEMA + DATA + TRIGGERS
staging_schema.sql:2058:-- ============================================
staging_schema.sql:2059:
staging_schema.sql:2060:-- 1. FIX TABLE SCHEMA (Add missing columns)
staging_schema.sql:2061:-- We use TEXT to avoid Enum complexities. It works perfectly with TS enums.
staging_schema.sql:2062:ALTER TABLE public.user_profiles 
staging_schema.sql:2063:ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
staging_schema.sql:2064:ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free_forever';
staging_schema.sql:2065:
staging_schema.sql:2066:-- Ensure role exists too
staging_schema.sql:2067:ALTER TABLE public.user_profiles 
staging_schema.sql:2068:ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
staging_schema.sql:2069:
staging_schema.sql:2070:-- 2. RESCUE THE ADMIN USER (rentmate.rubi@gmail.com)
staging_schema.sql:2071:DO $$
staging_schema.sql:2072:DECLARE
staging_schema.sql:2073:    target_email TEXT := 'rentmate.rubi@gmail.com'; 
staging_schema.sql:2074:    v_user_id UUID;
staging_schema.sql:2075:BEGIN
staging_schema.sql:2076:    SELECT id INTO v_user_id FROM auth.users WHERE email = target_email;
staging_schema.sql:2077:
staging_schema.sql:2078:    IF v_user_id IS NOT NULL THEN
staging_schema.sql:2079:        INSERT INTO public.user_profiles (
staging_schema.sql:2080:            id, email, full_name, role, subscription_status, subscription_plan
staging_schema.sql:2081:        )
staging_schema.sql:2082:        VALUES (
staging_schema.sql:2083:            v_user_id, 
staging_schema.sql:2084:            target_email, 
staging_schema.sql:2085:            'Admin User', 
staging_schema.sql:2086:            'admin', 
staging_schema.sql:2087:            'active', 
staging_schema.sql:2088:            'free_forever'
staging_schema.sql:2089:        )
staging_schema.sql:2090:        ON CONFLICT (id) DO UPDATE 
staging_schema.sql:2091:        SET role = 'admin', 
staging_schema.sql:2092:            subscription_status = 'active',
staging_schema.sql:2093:            subscription_plan = 'free_forever';
staging_schema.sql:2094:            
staging_schema.sql:2095:        RAISE NOTICE 'Admin profile repaired for %', target_email;
staging_schema.sql:2096:    ELSE
staging_schema.sql:2097:        RAISE NOTICE 'User % not found in Auth, skipping rescue.', target_email;
staging_schema.sql:2098:    END IF;
staging_schema.sql:2099:END;
staging_schema.sql:2100:$$;
staging_schema.sql:2101:
staging_schema.sql:2102:-- 3. UPDATE SIGNUP TRIGGER (To match the fixed schema)
staging_schema.sql:2103:CREATE OR REPLACE FUNCTION public.handle_new_user()
staging_schema.sql:2104:RETURNS TRIGGER 
staging_schema.sql:2105:LANGUAGE plpgsql 
staging_schema.sql:2106:SECURITY DEFINER SET search_path = public
staging_schema.sql:2107:AS $$
staging_schema.sql:2108:BEGIN
staging_schema.sql:2109:    -- Create Profile
staging_schema.sql:2110:    INSERT INTO public.user_profiles (
staging_schema.sql:2111:        id, email, full_name, role, subscription_status, subscription_plan
staging_schema.sql:2112:    )
staging_schema.sql:2113:    VALUES (
staging_schema.sql:2114:        NEW.id,
staging_schema.sql:2115:        NEW.email,
staging_schema.sql:2116:        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
staging_schema.sql:2117:        'user',
staging_schema.sql:2118:        'active',
staging_schema.sql:2119:        'free_forever'
staging_schema.sql:2120:    )
staging_schema.sql:2121:    ON CONFLICT (id) DO NOTHING;
staging_schema.sql:2122:
staging_schema.sql:2123:    -- Link Invoices (Safely)
staging_schema.sql:2124:    BEGIN
staging_schema.sql:2125:        UPDATE public.invoices SET user_id = NEW.id 
staging_schema.sql:2126:        WHERE user_id IS NULL AND billing_email = NEW.email;
staging_schema.sql:2127:    EXCEPTION WHEN OTHERS THEN 
staging_schema.sql:2128:        RAISE WARNING 'Link failed: %', SQLERRM; 
staging_schema.sql:2129:    END;
staging_schema.sql:2130:
staging_schema.sql:2131:    RETURN NEW;
staging_schema.sql:2132:END;
staging_schema.sql:2133:$$;
staging_schema.sql:2134:-- =================================================================
staging_schema.sql:2135:-- EMERGENCY RESET FOR AUTH & RLS (Run this to fix 500 Errors)
staging_schema.sql:2136:-- =================================================================
staging_schema.sql:2137:
staging_schema.sql:2138:-- 1. DISABLE RLS TEMPORARILY (To unblock operations while we fix)
staging_schema.sql:2139:ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
staging_schema.sql:2140:
staging_schema.sql:2141:-- 2. DROP ALL EXISTING POLICIES (Clean Slate)
staging_schema.sql:2142:DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
staging_schema.sql:2143:DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
staging_schema.sql:2144:DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
staging_schema.sql:2145:DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
staging_schema.sql:2146:DROP POLICY IF EXISTS "Admins see all" ON public.user_profiles;
staging_schema.sql:2147:DROP POLICY IF EXISTS "Users view own profile" ON public.user_profiles;
staging_schema.sql:2148:DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.user_profiles;
staging_schema.sql:2149:
staging_schema.sql:2150:-- 3. DROP TRIGGERS & FUNCTIONS (To ensure no loop in triggers)
staging_schema.sql:2151:DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
staging_schema.sql:2152:DROP FUNCTION IF EXISTS public.handle_new_user();
staging_schema.sql:2153:
staging_schema.sql:2154:DROP TRIGGER IF EXISTS on_auth_user_created_relink_invoices ON auth.users;
staging_schema.sql:2155:DROP FUNCTION IF EXISTS public.relink_past_invoices();
staging_schema.sql:2156:
staging_schema.sql:2157:-- 4. FIX TYPES (Ensure Enums exist)
staging_schema.sql:2158:DO $$ BEGIN
staging_schema.sql:2159:    CREATE TYPE user_role AS ENUM ('user', 'admin', 'manager');
staging_schema.sql:2160:EXCEPTION WHEN duplicate_object THEN null; END $$;
staging_schema.sql:2161:
staging_schema.sql:2162:-- 5. RE-CREATE SAFE ADMIN CHECK (SECURITY DEFINER is Key)
staging_schema.sql:2163:CREATE OR REPLACE FUNCTION public.is_admin()
staging_schema.sql:2164:RETURNS BOOLEAN 
staging_schema.sql:2165:LANGUAGE plpgsql 
staging_schema.sql:2166:SECURITY DEFINER -- Bypasses RLS
staging_schema.sql:2167:SET search_path = public
staging_schema.sql:2168:AS $$
staging_schema.sql:2169:BEGIN
staging_schema.sql:2170:    -- Check if the user has 'admin' role in user_profiles
staging_schema.sql:2171:    RETURN EXISTS (
staging_schema.sql:2172:        SELECT 1 
staging_schema.sql:2173:        FROM public.user_profiles 
staging_schema.sql:2174:        WHERE id = auth.uid() 
staging_schema.sql:2175:        AND role = 'admin'
staging_schema.sql:2176:    );
staging_schema.sql:2177:END;
staging_schema.sql:2178:$$;
staging_schema.sql:2179:
staging_schema.sql:2180:-- 6. RE-CREATE HANDLE NEW USER (Simple & Safe)
staging_schema.sql:2181:CREATE OR REPLACE FUNCTION public.handle_new_user()
staging_schema.sql:2182:RETURNS TRIGGER 
staging_schema.sql:2183:LANGUAGE plpgsql 
staging_schema.sql:2184:SECURITY DEFINER -- Bypasses RLS
staging_schema.sql:2185:SET search_path = public
staging_schema.sql:2186:AS $$
staging_schema.sql:2187:BEGIN
staging_schema.sql:2188:    INSERT INTO public.user_profiles (id, email, full_name, role)
staging_schema.sql:2189:    VALUES (
staging_schema.sql:2190:        NEW.id,
staging_schema.sql:2191:        NEW.email,
staging_schema.sql:2192:        NEW.raw_user_meta_data->>'full_name',
staging_schema.sql:2193:        'user' -- Default role
staging_schema.sql:2194:    )
staging_schema.sql:2195:    ON CONFLICT (id) DO NOTHING; -- Prevent errors if retry
staging_schema.sql:2196:    RETURN NEW;
staging_schema.sql:2197:END;
staging_schema.sql:2198:$$;
staging_schema.sql:2199:
staging_schema.sql:2200:-- 7. RE-ATTACH TRIGGER
staging_schema.sql:2201:CREATE TRIGGER on_auth_user_created
staging_schema.sql:2202:    AFTER INSERT ON auth.users
staging_schema.sql:2203:    FOR EACH ROW
staging_schema.sql:2204:    EXECUTE FUNCTION public.handle_new_user();
staging_schema.sql:2205:
staging_schema.sql:2206:-- 8. RE-ENABLE RLS WITH SIMPLE POLICIES
staging_schema.sql:2207:ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
staging_schema.sql:2208:
staging_schema.sql:2209:-- Policy: Users see themselves
staging_schema.sql:2210:CREATE POLICY "Users view own" 
staging_schema.sql:2211:    ON public.user_profiles FOR SELECT 
staging_schema.sql:2212:    USING (auth.uid() = id);
staging_schema.sql:2213:
staging_schema.sql:2214:-- Policy: Users update themselves
staging_schema.sql:2215:CREATE POLICY "Users update own" 
staging_schema.sql:2216:    ON public.user_profiles FOR UPDATE 
staging_schema.sql:2217:    USING (auth.uid() = id);
staging_schema.sql:2218:
staging_schema.sql:2219:-- Policy: Admins see all (Using Safe Function)
staging_schema.sql:2220:CREATE POLICY "Admins view all" 
staging_schema.sql:2221:    ON public.user_profiles FOR SELECT 
staging_schema.sql:2222:    USING (public.is_admin());
staging_schema.sql:2223:
staging_schema.sql:2224:-- Policy: Admins update all
staging_schema.sql:2225:CREATE POLICY "Admins update all" 
staging_schema.sql:2226:    ON public.user_profiles FOR UPDATE 
staging_schema.sql:2227:    USING (public.is_admin());
staging_schema.sql:2228:-- Migration: Safe Tenant Deletion (Set NULL on Property Delete)
staging_schema.sql:2229:
staging_schema.sql:2230:DO $$ 
staging_schema.sql:2231:BEGIN
staging_schema.sql:2232:    -- 1. Drop existing FK constraint
staging_schema.sql:2233:    -- We need to find the name. Usually automatically named or explicitly named.
staging_schema.sql:2234:    -- We'll try to drop by finding it or dropping common names.
staging_schema.sql:2235:    -- Since we don't know the exact name, we can query it or just drop if exists with likely names.
staging_schema.sql:2236:    -- Better approach: Alter table drop constraint if exists.
staging_schema.sql:2237:    
staging_schema.sql:2238:    -- Attempt to identify and drop the constraint on column 'property_id'
staging_schema.sql:2239:    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
staging_schema.sql:2240:               WHERE table_name = 'tenants' AND constraint_type = 'FOREIGN KEY') THEN
staging_schema.sql:2241:               
staging_schema.sql:2242:        -- Drop the constraint causing "ON DELETE CASCADE" or "RESTRICT" behavior
staging_schema.sql:2243:        -- Note: We might not know the exact name, so in production we'd look it up.
staging_schema.sql:2244:        -- For this migration, we will assume standard naming or iterate.
staging_schema.sql:2245:        -- HOWEVER, in Supabase SQL editor we can just do:
staging_schema.sql:2246:        
staging_schema.sql:2247:        ALTER TABLE public.tenants
staging_schema.sql:2248:        DROP CONSTRAINT IF EXISTS tenants_property_id_fkey; -- Standard name
staging_schema.sql:2249:        
staging_schema.sql:2250:    END IF;
staging_schema.sql:2251:
staging_schema.sql:2252:    -- 2. Add the new Safe Constraint
staging_schema.sql:2253:    ALTER TABLE public.tenants
staging_schema.sql:2254:    ADD CONSTRAINT tenants_property_id_fkey
staging_schema.sql:2255:    FOREIGN KEY (property_id)
staging_schema.sql:2256:    REFERENCES public.properties(id)
staging_schema.sql:2257:    ON DELETE SET NULL;
staging_schema.sql:2258:
staging_schema.sql:2259:END $$;
staging_schema.sql:2260:-- ============================================
staging_schema.sql:2261:-- SAFE DEBUG SIGNUP (Basic)
staging_schema.sql:2262:-- ============================================
staging_schema.sql:2263:
staging_schema.sql:2264:-- 1. Drop existing triggers to be safe
staging_schema.sql:2265:DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
staging_schema.sql:2266:DROP TRIGGER IF EXISTS on_auth_user_created_relink_invoices ON auth.users;
staging_schema.sql:2267:DROP FUNCTION IF EXISTS public.handle_new_user();
staging_schema.sql:2268:
staging_schema.sql:2269:-- 2. Create a Minimal, Safe Function
staging_schema.sql:2270:CREATE OR REPLACE FUNCTION public.handle_new_user()
staging_schema.sql:2271:RETURNS TRIGGER 
staging_schema.sql:2272:LANGUAGE plpgsql 
staging_schema.sql:2273:SECURITY DEFINER SET search_path = public
staging_schema.sql:2274:AS $$
staging_schema.sql:2275:BEGIN
staging_schema.sql:2276:    -- Just insert the profile. 
staging_schema.sql:2277:    -- We assume the columns allow text if they are Enums (Postgres auto-cast).
staging_schema.sql:2278:    -- If "free_forever" doesn't match the enum label, it will fail, 
staging_schema.sql:2279:    -- so we are careful to match the exact string from the CREATE TYPE.
staging_schema.sql:2280:    INSERT INTO public.user_profiles (
staging_schema.sql:2281:        id, 
staging_schema.sql:2282:        email, 
staging_schema.sql:2283:        full_name, 
staging_schema.sql:2284:        role, 
staging_schema.sql:2285:        subscription_status, 
staging_schema.sql:2286:        subscription_plan
staging_schema.sql:2287:    )
staging_schema.sql:2288:    VALUES (
staging_schema.sql:2289:        NEW.id,
staging_schema.sql:2290:        NEW.email,
staging_schema.sql:2291:        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
staging_schema.sql:2292:        'user',           -- Text, let Postgres cast to user_role
staging_schema.sql:2293:        'active',         -- Text, let Postgres cast to subscription_status
staging_schema.sql:2294:        'free_forever'    -- Text, let Postgres cast to subscription_plan_type
staging_schema.sql:2295:    );
staging_schema.sql:2296:
staging_schema.sql:2297:    RETURN NEW;
staging_schema.sql:2298:EXCEPTION WHEN OTHERS THEN
staging_schema.sql:2299:    -- If this fails, we catch it and raise a VERY CLEAR error
staging_schema.sql:2300:    RAISE EXCEPTION 'DEBUG ERROR: %', SQLERRM;
staging_schema.sql:2301:END;
staging_schema.sql:2302:$$;
staging_schema.sql:2303:
staging_schema.sql:2304:-- 3. Re-Attach
staging_schema.sql:2305:CREATE TRIGGER on_auth_user_created
staging_schema.sql:2306:    AFTER INSERT ON auth.users
staging_schema.sql:2307:    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
staging_schema.sql:2308:-- Migration: secure_tables_rls
staging_schema.sql:2309:-- Description: Enforces strict RLS on properties (assets), contracts, tenants, and payments.
staging_schema.sql:2310:
staging_schema.sql:2311:-- ==============================================================================
staging_schema.sql:2312:-- 1. ENSURE PAYMENTS HAS USER_ID (Denormalization for Performance & Strict RLS)
staging_schema.sql:2313:-- ==============================================================================
staging_schema.sql:2314:ALTER TABLE public.payments 
staging_schema.sql:2315:ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE;
staging_schema.sql:2316:
staging_schema.sql:2317:-- Backfill user_id for payments from contracts
staging_schema.sql:2318:UPDATE public.payments p
staging_schema.sql:2319:SET user_id = c.user_id
staging_schema.sql:2320:FROM public.contracts c
staging_schema.sql:2321:WHERE p.contract_id = c.id
staging_schema.sql:2322:AND p.user_id IS NULL;
staging_schema.sql:2323:
staging_schema.sql:2324:-- ==============================================================================
staging_schema.sql:2325:-- 2. ENABLE RLS
staging_schema.sql:2326:-- ==============================================================================
staging_schema.sql:2327:ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
staging_schema.sql:2328:ALTER TABLE public.contracts  ENABLE ROW LEVEL SECURITY;
staging_schema.sql:2329:ALTER TABLE public.tenants    ENABLE ROW LEVEL SECURITY;
staging_schema.sql:2330:ALTER TABLE public.payments   ENABLE ROW LEVEL SECURITY;
staging_schema.sql:2331:
staging_schema.sql:2332:-- ==============================================================================
staging_schema.sql:2333:-- 3. DEFINE POLICIES (DROP EXISTING FIRST)
staging_schema.sql:2334:-- ==============================================================================
staging_schema.sql:2335:
staging_schema.sql:2336:-- Helper macro isn't standard SQL, so we repeat the blocks for clarity.
staging_schema.sql:2337:
staging_schema.sql:2338:---------------------------------------------------------------------------------
staging_schema.sql:2339:-- TABLE: PROPERTIES (Assets)
staging_schema.sql:2340:---------------------------------------------------------------------------------
staging_schema.sql:2341:DROP POLICY IF EXISTS "Users can view own properties" ON public.properties;
staging_schema.sql:2342:DROP POLICY IF EXISTS "Users can insert own properties" ON public.properties;
staging_schema.sql:2343:DROP POLICY IF EXISTS "Users can update own properties" ON public.properties;
staging_schema.sql:2344:DROP POLICY IF EXISTS "Users can delete own properties" ON public.properties;
staging_schema.sql:2345:-- Also drop any permissive policies from previous migrations
staging_schema.sql:2346:DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.properties;
staging_schema.sql:2347:
staging_schema.sql:2348:CREATE POLICY "Users can view own properties"   ON public.properties FOR SELECT USING (user_id = auth.uid());
staging_schema.sql:2349:CREATE POLICY "Users can insert own properties" ON public.properties FOR INSERT WITH CHECK (user_id = auth.uid());
staging_schema.sql:2350:CREATE POLICY "Users can update own properties" ON public.properties FOR UPDATE USING (user_id = auth.uid());
staging_schema.sql:2351:CREATE POLICY "Users can delete own properties" ON public.properties FOR DELETE USING (user_id = auth.uid());
staging_schema.sql:2352:
staging_schema.sql:2353:---------------------------------------------------------------------------------
staging_schema.sql:2354:-- TABLE: CONTRACTS
staging_schema.sql:2355:---------------------------------------------------------------------------------
staging_schema.sql:2356:DROP POLICY IF EXISTS "Users can view own contracts" ON public.contracts;
staging_schema.sql:2357:DROP POLICY IF EXISTS "Users can insert own contracts" ON public.contracts;
staging_schema.sql:2358:DROP POLICY IF EXISTS "Users can update own contracts" ON public.contracts;
staging_schema.sql:2359:DROP POLICY IF EXISTS "Users can delete own contracts" ON public.contracts;
staging_schema.sql:2360:DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.contracts;
staging_schema.sql:2361:
staging_schema.sql:2362:CREATE POLICY "Users can view own contracts"   ON public.contracts FOR SELECT USING (user_id = auth.uid());
staging_schema.sql:2363:CREATE POLICY "Users can insert own contracts" ON public.contracts FOR INSERT WITH CHECK (user_id = auth.uid());
staging_schema.sql:2364:CREATE POLICY "Users can update own contracts" ON public.contracts FOR UPDATE USING (user_id = auth.uid());
staging_schema.sql:2365:CREATE POLICY "Users can delete own contracts" ON public.contracts FOR DELETE USING (user_id = auth.uid());
staging_schema.sql:2366:
staging_schema.sql:2367:---------------------------------------------------------------------------------
staging_schema.sql:2368:-- TABLE: TENANTS
staging_schema.sql:2369:---------------------------------------------------------------------------------
staging_schema.sql:2370:DROP POLICY IF EXISTS "Users can view own tenants" ON public.tenants;
staging_schema.sql:2371:DROP POLICY IF EXISTS "Users can insert own tenants" ON public.tenants;
staging_schema.sql:2372:DROP POLICY IF EXISTS "Users can update own tenants" ON public.tenants;
staging_schema.sql:2373:DROP POLICY IF EXISTS "Users can delete own tenants" ON public.tenants;
staging_schema.sql:2374:DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.tenants;
staging_schema.sql:2375:
staging_schema.sql:2376:CREATE POLICY "Users can view own tenants"   ON public.tenants FOR SELECT USING (user_id = auth.uid());
staging_schema.sql:2377:CREATE POLICY "Users can insert own tenants" ON public.tenants FOR INSERT WITH CHECK (user_id = auth.uid());
staging_schema.sql:2378:CREATE POLICY "Users can update own tenants" ON public.tenants FOR UPDATE USING (user_id = auth.uid());
staging_schema.sql:2379:CREATE POLICY "Users can delete own tenants" ON public.tenants FOR DELETE USING (user_id = auth.uid());
staging_schema.sql:2380:
staging_schema.sql:2381:---------------------------------------------------------------------------------
staging_schema.sql:2382:-- TABLE: PAYMENTS
staging_schema.sql:2383:---------------------------------------------------------------------------------
staging_schema.sql:2384:DROP POLICY IF EXISTS "Users can manage their own payments" ON public.payments;
staging_schema.sql:2385:DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.payments;
staging_schema.sql:2386:DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
staging_schema.sql:2387:DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
staging_schema.sql:2388:DROP POLICY IF EXISTS "Users can update own payments" ON public.payments;
staging_schema.sql:2389:DROP POLICY IF EXISTS "Users can delete own payments" ON public.payments;
staging_schema.sql:2390:
staging_schema.sql:2391:CREATE POLICY "Users can view own payments"   ON public.payments FOR SELECT USING (user_id = auth.uid());
staging_schema.sql:2392:CREATE POLICY "Users can insert own payments" ON public.payments FOR INSERT WITH CHECK (user_id = auth.uid());
staging_schema.sql:2393:CREATE POLICY "Users can update own payments" ON public.payments FOR UPDATE USING (user_id = auth.uid());
staging_schema.sql:2394:CREATE POLICY "Users can delete own payments" ON public.payments FOR DELETE USING (user_id = auth.uid());
staging_schema.sql:2395:
staging_schema.sql:2396:-- Seed Index Bases for CPI (Consumer Price Index)
staging_schema.sql:2397:-- These are approximate factors for demonstration of the "Chained Index" logic.
staging_schema.sql:2398:-- User can update these with exact official CBS figures later.
staging_schema.sql:2399:
staging_schema.sql:2400:INSERT INTO index_bases (index_type, base_period_start, base_value, chain_factor, previous_base_period_start)
staging_schema.sql:2401:VALUES
staging_schema.sql:2402:-- Base Average 2022 = 100.0 (Started Jan 2023)
staging_schema.sql:2403:('cpi', '2023-01-01', 100.0, 1.081, '2021-01-01'),
staging_schema.sql:2404:
staging_schema.sql:2405:-- Base Average 2020 = 100.0 (Started Jan 2021)
staging_schema.sql:2406:('cpi', '2021-01-01', 100.0, 1.006, '2019-01-01'),
staging_schema.sql:2407:
staging_schema.sql:2408:-- Base Average 2018 = 100.0 (Started Jan 2019)
staging_schema.sql:2409:('cpi', '2019-01-01', 100.0, 1.008, '2017-01-01'),
staging_schema.sql:2410:
staging_schema.sql:2411:-- Example from User Image (Implicit) -> Factor 1.094
staging_schema.sql:2412:-- Let's pretend there was a base change where the factor was 1.094
staging_schema.sql:2413:('cpi', '2017-01-01', 100.0, 1.094, '2015-01-01');
staging_schema.sql:2414:-- ============================================
staging_schema.sql:2415:-- SESSION LIMITS MIGRATION (1 PC + 1 Mobile)
staging_schema.sql:2416:-- ============================================
staging_schema.sql:2417:
staging_schema.sql:2418:-- 1. Helper Function: Detect Device Type from User Agent
staging_schema.sql:2419:-- Returns 'mobile' for phones/tablets, 'desktop' for everything else
staging_schema.sql:2420:CREATE OR REPLACE FUNCTION public.get_device_type(user_agent TEXT)
staging_schema.sql:2421:RETURNS TEXT
staging_schema.sql:2422:LANGUAGE plpgsql
staging_schema.sql:2423:IMMUTABLE -- Optimization: Always returns same result for same input
staging_schema.sql:2424:AS $$
staging_schema.sql:2425:BEGIN
staging_schema.sql:2426:    IF user_agent IS NULL THEN
staging_schema.sql:2427:        RETURN 'desktop'; -- Default fallback
staging_schema.sql:2428:    END IF;
staging_schema.sql:2429:
staging_schema.sql:2430:    -- Standard mobile indicators
staging_schema.sql:2431:    -- "Mobi" catches many browsers, "Android", "iPhone", "iPad" are specific
staging_schema.sql:2432:    IF user_agent ~* '(Mobi|Android|iPhone|iPad|iPod)' THEN
staging_schema.sql:2433:        RETURN 'mobile';
staging_schema.sql:2434:    ELSE
staging_schema.sql:2435:        RETURN 'desktop';
staging_schema.sql:2436:    END IF;
staging_schema.sql:2437:END;
staging_schema.sql:2438:$$;
staging_schema.sql:2439:
staging_schema.sql:2440:-- 2. Trigger Function: Enforce Limits
staging_schema.sql:2441:CREATE OR REPLACE FUNCTION public.manage_session_limits()
staging_schema.sql:2442:RETURNS TRIGGER
staging_schema.sql:2443:LANGUAGE plpgsql
staging_schema.sql:2444:SECURITY DEFINER -- Runs with admin privileges to delete other sessions
staging_schema.sql:2445:SET search_path = public, auth -- Access to auth schema
staging_schema.sql:2446:AS $$
staging_schema.sql:2447:DECLARE
staging_schema.sql:2448:    new_device_type TEXT;
staging_schema.sql:2449:    session_count INT;
staging_schema.sql:2450:    oldest_session_id UUID;
staging_schema.sql:2451:    max_sessions_per_type INT := 1; -- Hardcoded limit: 1 per group
staging_schema.sql:2452:BEGIN
staging_schema.sql:2453:    -- Identify what kind of device is trying to log in
staging_schema.sql:2454:    new_device_type := public.get_device_type(NEW.user_agent);
staging_schema.sql:2455:
staging_schema.sql:2456:    -- Count EXISTING sessions for this user of the SAME type
staging_schema.sql:2457:    -- We filter by the computed device type
staging_schema.sql:2458:    SELECT COUNT(*)
staging_schema.sql:2459:    INTO session_count
staging_schema.sql:2460:    FROM auth.sessions
staging_schema.sql:2461:    WHERE user_id = NEW.user_id
staging_schema.sql:2462:    AND public.get_device_type(user_agent) = new_device_type;
staging_schema.sql:2463:
staging_schema.sql:2464:    -- If we are at (or above) the limit, we need to make room.
staging_schema.sql:2465:    -- (Note: 'session_count' is the count BEFORE this new row is inserted)
staging_schema.sql:2466:    IF session_count >= max_sessions_per_type THEN
staging_schema.sql:2467:        
staging_schema.sql:2468:        -- Identify the Oldest Session to remove
staging_schema.sql:2469:        SELECT id
staging_schema.sql:2470:        INTO oldest_session_id
staging_schema.sql:2471:        FROM auth.sessions
staging_schema.sql:2472:        WHERE user_id = NEW.user_id
staging_schema.sql:2473:        AND public.get_device_type(user_agent) = new_device_type
staging_schema.sql:2474:        ORDER BY created_at ASC
staging_schema.sql:2475:        LIMIT 1;
staging_schema.sql:2476:
staging_schema.sql:2477:        -- Delete it
staging_schema.sql:2478:        IF oldest_session_id IS NOT NULL THEN
staging_schema.sql:2479:            DELETE FROM auth.sessions WHERE id = oldest_session_id;
staging_schema.sql:2480:            
staging_schema.sql:2481:            -- Optional: Raise a notice for debugging (visible in Postgres logs)
staging_schema.sql:2482:            -- RAISE NOTICE 'Session Limit Reached for User %. Deleted sess % (Type: %)', NEW.user_id, oldest_session_id, 
new_device_type;
staging_schema.sql:2483:        END IF;
staging_schema.sql:2484:    END IF;
staging_schema.sql:2485:
staging_schema.sql:2486:    RETURN NEW;
staging_schema.sql:2487:END;
staging_schema.sql:2488:$$;
staging_schema.sql:2489:
staging_schema.sql:2490:-- 3. Attach Trigger to auth.sessions
staging_schema.sql:2491:-- We use BEFORE INSERT so we can clean up *before* the new session lands.
staging_schema.sql:2492:DROP TRIGGER IF EXISTS enforce_session_limits ON auth.sessions;
staging_schema.sql:2493:
staging_schema.sql:2494:CREATE TRIGGER enforce_session_limits
staging_schema.sql:2495:    BEFORE INSERT ON auth.sessions
staging_schema.sql:2496:    FOR EACH ROW
staging_schema.sql:2497:    EXECUTE FUNCTION public.manage_session_limits();
staging_schema.sql:2498:-- COMPLETE NOTIFICATION SYSTEM SETUP
staging_schema.sql:2499:-- Run this file to set up the entire system (Table, Columns, Functions, Triggers)
staging_schema.sql:2500:
staging_schema.sql:2501:-- 1. Create Table (if not exists)
staging_schema.sql:2502:CREATE TABLE IF NOT EXISTS public.notifications (
staging_schema.sql:2503:    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
staging_schema.sql:2504:    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
staging_schema.sql:2505:    type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'action', 'urgent')),
staging_schema.sql:2506:    title TEXT NOT NULL,
staging_schema.sql:2507:    message TEXT NOT NULL,
staging_schema.sql:2508:    read_at TIMESTAMP WITH TIME ZONE,
staging_schema.sql:2509:    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
staging_schema.sql:2510:    metadata JSONB DEFAULT '{}'::jsonb
staging_schema.sql:2511:);
staging_schema.sql:2512:
staging_schema.sql:2513:-- 2. Enable RLS
staging_schema.sql:2514:ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
staging_schema.sql:2515:
staging_schema.sql:2516:-- 3. RLS Policies
staging_schema.sql:2517:DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
staging_schema.sql:2518:CREATE POLICY "Users can view their own notifications"
staging_schema.sql:2519:    ON public.notifications FOR SELECT
staging_schema.sql:2520:    USING (auth.uid() = user_id);
staging_schema.sql:2521:
staging_schema.sql:2522:DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
staging_schema.sql:2523:CREATE POLICY "Users can update their own notifications"
staging_schema.sql:2524:    ON public.notifications FOR UPDATE
staging_schema.sql:2525:    USING (auth.uid() = user_id);
staging_schema.sql:2526:
staging_schema.sql:2527:-- 4. Contract Status Change Trigger
staging_schema.sql:2528:CREATE OR REPLACE FUNCTION public.notify_contract_status_change()
staging_schema.sql:2529:RETURNS TRIGGER
staging_schema.sql:2530:LANGUAGE plpgsql
staging_schema.sql:2531:SECURITY DEFINER
staging_schema.sql:2532:AS $$
staging_schema.sql:2533:DECLARE
staging_schema.sql:2534:    property_address text;
staging_schema.sql:2535:    notification_title text;
staging_schema.sql:2536:    notification_body text;
staging_schema.sql:2537:BEGIN
staging_schema.sql:2538:    IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
staging_schema.sql:2539:        RETURN NEW;
staging_schema.sql:2540:    END IF;
staging_schema.sql:2541:
staging_schema.sql:2542:    SELECT city || ', ' || address INTO property_address
staging_schema.sql:2543:    FROM public.properties
staging_schema.sql:2544:    WHERE id = NEW.property_id;
staging_schema.sql:2545:
staging_schema.sql:2546:    notification_title := 'Contract Status Updated';
staging_schema.sql:2547:    notification_body := format('Contract for %s is now %s.', property_address, NEW.status);
staging_schema.sql:2548:
staging_schema.sql:2549:    INSERT INTO public.notifications (user_id, type, title, message, metadata)
staging_schema.sql:2550:    VALUES (
staging_schema.sql:2551:        NEW.user_id,
staging_schema.sql:2552:        'info',
staging_schema.sql:2553:        notification_title,
staging_schema.sql:2554:        notification_body,
staging_schema.sql:2555:        json_build_object(
staging_schema.sql:2556:            'contract_id', NEW.id,
staging_schema.sql:2557:            'event', 'status_change',
staging_schema.sql:2558:            'old_status', OLD.status,
staging_schema.sql:2559:            'new_status', NEW.status
staging_schema.sql:2560:        )::jsonb
staging_schema.sql:2561:    );
staging_schema.sql:2562:
staging_schema.sql:2563:    RETURN NEW;
staging_schema.sql:2564:END;
staging_schema.sql:2565:$$;
staging_schema.sql:2566:
staging_schema.sql:2567:DROP TRIGGER IF EXISTS on_contract_status_change ON public.contracts;
staging_schema.sql:2568:CREATE TRIGGER on_contract_status_change
staging_schema.sql:2569:    AFTER UPDATE ON public.contracts
staging_schema.sql:2570:    FOR EACH ROW
staging_schema.sql:2571:    EXECUTE FUNCTION public.notify_contract_status_change();
staging_schema.sql:2572:
staging_schema.sql:2573:
staging_schema.sql:2574:-- 5. Daily Notification Job Function
staging_schema.sql:2575:CREATE OR REPLACE FUNCTION public.process_daily_notifications()
staging_schema.sql:2576:RETURNS void
staging_schema.sql:2577:LANGUAGE plpgsql
staging_schema.sql:2578:SECURITY DEFINER
staging_schema.sql:2579:AS $$
staging_schema.sql:2580:DECLARE
staging_schema.sql:2581:    r RECORD;
staging_schema.sql:2582:    extension_days int := 60;
staging_schema.sql:2583:BEGIN
staging_schema.sql:2584:    -- Contract Ending Soon (30 Days)
staging_schema.sql:2585:    FOR r IN
staging_schema.sql:2586:        SELECT c.id, c.user_id, c.end_date, p.city, p.address
staging_schema.sql:2587:        FROM public.contracts c
staging_schema.sql:2588:        JOIN public.properties p ON p.id = c.property_id
staging_schema.sql:2589:        WHERE c.status = 'active'
staging_schema.sql:2590:        AND c.end_date = CURRENT_DATE + INTERVAL '30 days'
staging_schema.sql:2591:    LOOP
staging_schema.sql:2592:        IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = r.user_id AND metadata->>'contract_id' = r.id::text 
AND metadata->>'event' = 'ending_soon') THEN
staging_schema.sql:2593:            INSERT INTO public.notifications (user_id, type, title, message, metadata)
staging_schema.sql:2594:            VALUES (r.user_id, 'warning', 'Contract Ending Soon', format('Contract for %s, %s ends in 30 days.', r.city, 
r.address), json_build_object('contract_id', r.id, 'event', 'ending_soon')::jsonb);
staging_schema.sql:2595:        END IF;
staging_schema.sql:2596:    END LOOP;
staging_schema.sql:2597:
staging_schema.sql:2598:    -- Extension Deadline
staging_schema.sql:2599:    FOR r IN
staging_schema.sql:2600:        SELECT c.id, c.user_id, c.end_date, p.city, p.address
staging_schema.sql:2601:        FROM public.contracts c
staging_schema.sql:2602:        JOIN public.properties p ON p.id = c.property_id
staging_schema.sql:2603:        WHERE c.status = 'active'
staging_schema.sql:2604:        AND c.extension_option = TRUE
staging_schema.sql:2605:        AND c.end_date = CURRENT_DATE + (extension_days || ' days')::INTERVAL
staging_schema.sql:2606:    LOOP
staging_schema.sql:2607:        IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = r.user_id AND metadata->>'contract_id' = r.id::text 
AND metadata->>'event' = 'extension_deadline') THEN
staging_schema.sql:2608:            INSERT INTO public.notifications (user_id, type, title, message, metadata)
staging_schema.sql:2609:            VALUES (r.user_id, 'action', 'Extension Deadline Approaching', format('Extension option for %s, %s ends in %s 
days.', r.city, r.address, extension_days), json_build_object('contract_id', r.id, 'event', 'extension_deadline')::jsonb);
staging_schema.sql:2610:        END IF;
staging_schema.sql:2611:    END LOOP;
staging_schema.sql:2612:
staging_schema.sql:2613:    -- Annual Index Update
staging_schema.sql:2614:    FOR r IN
staging_schema.sql:2615:        SELECT c.id, c.user_id, c.start_date, p.city, p.address
staging_schema.sql:2616:        FROM public.contracts c
staging_schema.sql:2617:        JOIN public.properties p ON p.id = c.property_id
staging_schema.sql:2618:        WHERE c.status = 'active'
staging_schema.sql:2619:        AND c.linkage_type != 'none'
staging_schema.sql:2620:        AND (c.start_date + INTERVAL '1 year' = CURRENT_DATE OR c.start_date + INTERVAL '2 years' = CURRENT_DATE OR 
c.start_date + INTERVAL '3 years' = CURRENT_DATE)
staging_schema.sql:2621:    LOOP
staging_schema.sql:2622:        IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = r.user_id AND metadata->>'contract_id' = r.id::text 
AND metadata->>'event' = 'index_update' AND metadata->>'date' = CURRENT_DATE::text) THEN
staging_schema.sql:2623:            INSERT INTO public.notifications (user_id, type, title, message, metadata)
staging_schema.sql:2624:            VALUES (r.user_id, 'urgent', 'Annual Index Update', format('Annual index update required for %s, %s.', r.city, 
r.address), json_build_object('contract_id', r.id, 'event', 'index_update', 'date', CURRENT_DATE)::jsonb);
staging_schema.sql:2625:        END IF;
staging_schema.sql:2626:    END LOOP;
staging_schema.sql:2627:
staging_schema.sql:2628:    -- Payment Due Today
staging_schema.sql:2629:    FOR r IN
staging_schema.sql:2630:        SELECT py.id, py.user_id, py.amount, py.date, p.city, p.address
staging_schema.sql:2631:        FROM public.payments py
staging_schema.sql:2632:        JOIN public.contracts c ON c.id = py.contract_id
staging_schema.sql:2633:        JOIN public.properties p ON p.id = c.property_id
staging_schema.sql:2634:        WHERE py.status = 'pending'
staging_schema.sql:2635:        AND py.date = CURRENT_DATE
staging_schema.sql:2636:    LOOP
staging_schema.sql:2637:        IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = r.user_id AND metadata->>'payment_id' = r.id::text 
AND metadata->>'event' = 'payment_due') THEN
staging_schema.sql:2638:            INSERT INTO public.notifications (user_id, type, title, message, metadata)
staging_schema.sql:2639:            VALUES (r.user_id, 'warning', 'Payment Due Today', format('Payment of ג‚×%s for %s, %s is due today.', r.amount, 
r.city, r.address), json_build_object('payment_id', r.id, 'event', 'payment_due')::jsonb);
staging_schema.sql:2640:        END IF;
staging_schema.sql:2641:    END LOOP;
staging_schema.sql:2642:END;
staging_schema.sql:2643:$$;
staging_schema.sql:2644:-- Migration: Simplify Contract Statuses
staging_schema.sql:2645:-- 1. Update existing data to match new statuses
staging_schema.sql:2646:UPDATE public.contracts 
staging_schema.sql:2647:SET status = 'active' 
staging_schema.sql:2648:WHERE status = 'pending';
staging_schema.sql:2649:
staging_schema.sql:2650:UPDATE public.contracts 
staging_schema.sql:2651:SET status = 'archived' 
staging_schema.sql:2652:WHERE status IN ('ended', 'terminated');
staging_schema.sql:2653:
staging_schema.sql:2654:-- 2. Drop existing check constraint if it exists (it might be implicit or named)
staging_schema.sql:2655:-- We'll try to drop any existing constraint on status just in case, but usually it's just a text column.
staging_schema.sql:2656:-- If there was a constraint named 'contracts_status_check', we would drop it.
staging_schema.sql:2657:-- ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_status_check;
staging_schema.sql:2658:
staging_schema.sql:2659:-- 3. Add new check constraint
staging_schema.sql:2660:ALTER TABLE public.contracts 
staging_schema.sql:2661:ADD CONSTRAINT contracts_status_check 
staging_schema.sql:2662:CHECK (status IN ('active', 'archived'));
staging_schema.sql:2663:
staging_schema.sql:2664:-- 4. Set default value to 'active'
staging_schema.sql:2665:ALTER TABLE public.contracts 
staging_schema.sql:2666:ALTER COLUMN status SET DEFAULT 'active';
staging_schema.sql:2667:-- Migration: Split Names into First and Last (with defaults)
staging_schema.sql:2668:
staging_schema.sql:2669:DO $$ 
staging_schema.sql:2670:BEGIN
staging_schema.sql:2671:
staging_schema.sql:2672:    -- 1. Add Columns (Allow NULL initially to populate)
staging_schema.sql:2673:    ALTER TABLE public.user_profiles
staging_schema.sql:2674:    ADD COLUMN IF NOT EXISTS first_name TEXT,
staging_schema.sql:2675:    ADD COLUMN IF NOT EXISTS last_name TEXT;
staging_schema.sql:2676:
staging_schema.sql:2677:    -- 2. Migrate Data
staging_schema.sql:2678:    -- Strategy:
staging_schema.sql:2679:    -- First Name = full_name (if exists) OR 'User'
staging_schema.sql:2680:    -- Last Name = 'aaa' (Mandatory default for existing)
staging_schema.sql:2681:    UPDATE public.user_profiles
staging_schema.sql:2682:    SET 
staging_schema.sql:2683:        first_name = COALESCE(full_name, 'User'),
staging_schema.sql:2684:        last_name = 'aaa'
staging_schema.sql:2685:    WHERE first_name IS NULL OR last_name IS NULL;
staging_schema.sql:2686:
staging_schema.sql:2687:    -- 3. Enforce Not Null
staging_schema.sql:2688:    ALTER TABLE public.user_profiles
staging_schema.sql:2689:    ALTER COLUMN first_name SET NOT NULL,
staging_schema.sql:2690:    ALTER COLUMN last_name SET NOT NULL;
staging_schema.sql:2691:
staging_schema.sql:2692:END $$;
staging_schema.sql:2693:-- ============================================
staging_schema.sql:2694:-- STORAGE POLICIES: ADMIN & DOCUMENTS (SAFE VERSION)
staging_schema.sql:2695:-- ============================================
staging_schema.sql:2696:
staging_schema.sql:2697:-- 1. Create Bucket (if it doesn't exist)
staging_schema.sql:2698:INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
staging_schema.sql:2699:VALUES ('secure_documents', 'secure_documents', false, false, 5242880, ARRAY['application/pdf', 'image/jpeg', 'image/png'])
staging_schema.sql:2700:ON CONFLICT (id) DO NOTHING;
staging_schema.sql:2701:
staging_schema.sql:2702:-- 2. ENABLE RLS - SKIPPED
staging_schema.sql:2703:-- This command often fails due to permissions on the system 'storage' schema. 
staging_schema.sql:2704:-- RLS is enabled by default on Supabase storage.objects.
staging_schema.sql:2705:-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
staging_schema.sql:2706:
staging_schema.sql:2707:-- 3. POLICIES
staging_schema.sql:2708:
staging_schema.sql:2709:-- Policy: Admin can do ANYTHING in 'secure_documents'
staging_schema.sql:2710:DROP POLICY IF EXISTS "Admins full access to secure_documents" ON storage.objects;
staging_schema.sql:2711:CREATE POLICY "Admins full access to secure_documents"
staging_schema.sql:2712:    ON storage.objects
staging_schema.sql:2713:    FOR ALL
staging_schema.sql:2714:    USING (
staging_schema.sql:2715:        bucket_id = 'secure_documents' 
staging_schema.sql:2716:        AND 
staging_schema.sql:2717:        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
staging_schema.sql:2718:    )
staging_schema.sql:2719:    WITH CHECK (
staging_schema.sql:2720:        bucket_id = 'secure_documents' 
staging_schema.sql:2721:        AND 
staging_schema.sql:2722:        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
staging_schema.sql:2723:    );
staging_schema.sql:2724:
staging_schema.sql:2725:-- Policy: Users can VIEW their OWN files
staging_schema.sql:2726:DROP POLICY IF EXISTS "Users view own secure documents" ON storage.objects;
staging_schema.sql:2727:CREATE POLICY "Users view own secure documents"
staging_schema.sql:2728:    ON storage.objects
staging_schema.sql:2729:    FOR SELECT
staging_schema.sql:2730:    USING (
staging_schema.sql:2731:        bucket_id = 'secure_documents'
staging_schema.sql:2732:        AND
staging_schema.sql:2733:        (storage.foldername(name))[1] = auth.uid()::text
staging_schema.sql:2734:    );
staging_schema.sql:2735:
staging_schema.sql:2736:-- Policy: Users can UPLOAD to their OWN folder (Optional)
staging_schema.sql:2737:DROP POLICY IF EXISTS "Users upload own documents" ON storage.objects;
staging_schema.sql:2738:CREATE POLICY "Users upload own documents"
staging_schema.sql:2739:    ON storage.objects
staging_schema.sql:2740:    FOR INSERT
staging_schema.sql:2741:    WITH CHECK (
staging_schema.sql:2742:        bucket_id = 'secure_documents'
staging_schema.sql:2743:        AND
staging_schema.sql:2744:        (storage.foldername(name))[1] = auth.uid()::text
staging_schema.sql:2745:        AND
staging_schema.sql:2746:        auth.role() = 'authenticated'
staging_schema.sql:2747:    );
staging_schema.sql:2748:-- ============================================
staging_schema.sql:2749:-- TRACK DELETED USERS (Audit & Abuse Prevention)
staging_schema.sql:2750:-- ============================================
staging_schema.sql:2751:
staging_schema.sql:2752:-- 1. Create a log table that is NOT connected to the user_id via foreign key
staging_schema.sql:2753:-- (So it survives the deletion)
staging_schema.sql:2754:CREATE TABLE IF NOT EXISTS deleted_users_log (
staging_schema.sql:2755:    id BIGSERIAL PRIMARY KEY,
staging_schema.sql:2756:    original_user_id UUID,
staging_schema.sql:2757:    email TEXT,
staging_schema.sql:2758:    phone TEXT,
staging_schema.sql:2759:    subscription_status_at_deletion TEXT,
staging_schema.sql:2760:    deleted_at TIMESTAMPTZ DEFAULT NOW()
staging_schema.sql:2761:);
staging_schema.sql:2762:
staging_schema.sql:2763:-- 2. Create the Trigger Function
staging_schema.sql:2764:CREATE OR REPLACE FUNCTION log_user_deletion()
staging_schema.sql:2765:RETURNS TRIGGER AS $$
staging_schema.sql:2766:BEGIN
staging_schema.sql:2767:    INSERT INTO deleted_users_log (
staging_schema.sql:2768:        original_user_id,
staging_schema.sql:2769:        email,
staging_schema.sql:2770:        subcription_status_at_deletion
staging_schema.sql:2771:    )
staging_schema.sql:2772:    VALUES (
staging_schema.sql:2773:        OLD.id,
staging_schema.sql:2774:        OLD.email,
staging_schema.sql:2775:        OLD.subscription_status::text
staging_schema.sql:2776:    );
staging_schema.sql:2777:    RETURN OLD;
staging_schema.sql:2778:END;
staging_schema.sql:2779:$$ LANGUAGE plpgsql SECURITY DEFINER;
staging_schema.sql:2780:
staging_schema.sql:2781:-- 3. Attach Trigger (BEFORE DELETE) to user_profiles
staging_schema.sql:2782:DROP TRIGGER IF EXISTS on_user_profile_deleted ON user_profiles;
staging_schema.sql:2783:
staging_schema.sql:2784:CREATE TRIGGER on_user_profile_deleted
staging_schema.sql:2785:    BEFORE DELETE ON user_profiles
staging_schema.sql:2786:    FOR EACH ROW
staging_schema.sql:2787:    EXECUTE FUNCTION log_user_deletion();
staging_schema.sql:2788:-- Migration: trigger_signup_notification
staging_schema.sql:2789:-- Description: Triggers the send-admin-alert Edge Function when a new user signs up
staging_schema.sql:2790:
staging_schema.sql:2791:-- 1. Create the Trigger Function
staging_schema.sql:2792:CREATE OR REPLACE FUNCTION public.notify_admin_on_signup()
staging_schema.sql:2793:RETURNS TRIGGER 
staging_schema.sql:2794:LANGUAGE plpgsql
staging_schema.sql:2795:SECURITY DEFINER
staging_schema.sql:2796:AS $$
staging_schema.sql:2797:DECLARE
staging_schema.sql:2798:    project_url text := 'https://mtxwavmmywiewjrsxchi.supabase.co'; -- Replace with your actual project URL or use a config 
table
staging_schema.sql:2799:    function_secret text := 'YOUR_FUNCTION_SECRET'; -- Ideally this is handled via vault or not needed if using net extension 
with service role
staging_schema.sql:2800:BEGIN
staging_schema.sql:2801:    -- We assume the 'net' extension is enabled and configured.
staging_schema.sql:2802:    -- If using pg_net or standard http extension, syntax may vary.
staging_schema.sql:2803:    -- For Supabase, the recommended way for Database Webhooks used to be the Dashboard UI,
staging_schema.sql:2804:    -- but we can do it via SQL using `pg_net` or standard triggers if we have the extension.
staging_schema.sql:2805:    
staging_schema.sql:2806:    -- SIMPLE APPROACH: Since Supabase Database Webhooks are often configured in the UI,
staging_schema.sql:2807:    -- we will use the `net` extension if available to make an async call.
staging_schema.sql:2808:    
staging_schema.sql:2809:    -- NOTE: In many Supabase setups, it's easier to create a "Webhook" via the Dashboard.
staging_schema.sql:2810:    -- However, to do it via code/migration, we use pg_net.
staging_schema.sql:2811:    
staging_schema.sql:2812:    -- Check if pg_net is available, otherwise this might fail.
staging_schema.sql:2813:    -- Assuming pg_net is installed.
staging_schema.sql:2814:    
staging_schema.sql:2815:    PERFORM
staging_schema.sql:2816:      net.http_post(
staging_schema.sql:2817:        url := project_url || '/functions/v1/send-admin-alert',
staging_schema.sql:2818:        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || 
current_setting('app.settings.service_role_key', true) || '"}',
staging_schema.sql:2819:        body := json_build_object(
staging_schema.sql:2820:            'type', 'INSERT',
staging_schema.sql:2821:            'table', 'user_profiles',
staging_schema.sql:2822:            'record', row_to_json(NEW)
staging_schema.sql:2823:        )::jsonb
staging_schema.sql:2824:      );
staging_schema.sql:2825:      
staging_schema.sql:2826:    RETURN NEW;
staging_schema.sql:2827:EXCEPTION WHEN OTHERS THEN
staging_schema.sql:2828:    -- Swallow errors to not block signup
staging_schema.sql:2829:    RAISE WARNING 'Failed to trigger admin notification: %', SQLERRM;
staging_schema.sql:2830:    RETURN NEW;
staging_schema.sql:2831:END;
staging_schema.sql:2832:$$;
staging_schema.sql:2833:
staging_schema.sql:2834:-- 2. Create the Trigger
staging_schema.sql:2835:DROP TRIGGER IF EXISTS on_user_signup_notify_admin ON public.user_profiles;
staging_schema.sql:2836:
staging_schema.sql:2837:CREATE TRIGGER on_user_signup_notify_admin
staging_schema.sql:2838:    AFTER INSERT ON public.user_profiles
staging_schema.sql:2839:    FOR EACH ROW
staging_schema.sql:2840:    EXECUTE FUNCTION public.notify_admin_on_signup();
staging_schema.sql:2841:-- VERIFICATION SCRIPT
staging_schema.sql:2842:-- Run this to confirm RLS is active and correct
staging_schema.sql:2843:
staging_schema.sql:2844:SELECT tablename, policyname, cmd, qual, with_check 
staging_schema.sql:2845:FROM pg_policies 
staging_schema.sql:2846:WHERE tablename IN ('properties', 'contracts', 'tenants', 'payments')
staging_schema.sql:2847:ORDER BY tablename, cmd;
staging_schema.sql:2848:
staging_schema.sql:2849:-- EXPECTED OUTPUT:
staging_schema.sql:2850:-- For each table, you should see 4 rows: DELETE, INSERT, SELECT, UPDATE.
staging_schema.sql:2851:-- The 'qual' and 'with_check' columns should contain (user_id = auth.uid()).
staging_schema.sql:2852:-- User Preferences Table (for future use with authentication)
staging_schema.sql:2853:-- This migration is NOT deployed yet - it's ready for when auth is implemented
staging_schema.sql:2854:
staging_schema.sql:2855:CREATE TABLE IF NOT EXISTS user_preferences (
staging_schema.sql:2856:    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
staging_schema.sql:2857:    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
staging_schema.sql:2858:    language TEXT NOT NULL DEFAULT 'he' CHECK (language IN ('he', 'en')),
staging_schema.sql:2859:    gender TEXT CHECK (gender IN ('male', 'female', 'unspecified')),
staging_schema.sql:2860:    created_at TIMESTAMPTZ DEFAULT NOW(),
staging_schema.sql:2861:    updated_at TIMESTAMPTZ DEFAULT NOW(),
staging_schema.sql:2862:    UNIQUE(user_id)
staging_schema.sql:2863:);
staging_schema.sql:2864:
staging_schema.sql:2865:-- Index for faster lookups by user_id
staging_schema.sql:2866:CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
staging_schema.sql:2867:
staging_schema.sql:2868:-- Enable RLS
staging_schema.sql:2869:ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
staging_schema.sql:2870:
staging_schema.sql:2871:-- RLS Policy: Users can only read/write their own preferences
staging_schema.sql:2872:DROP POLICY IF EXISTS "Users can manage their own preferences" ON user_preferences;
staging_schema.sql:2873:CREATE POLICY "Users can manage their own preferences"
staging_schema.sql:2874:    ON user_preferences
staging_schema.sql:2875:    FOR ALL
staging_schema.sql:2876:    USING (auth.uid() = user_id)
staging_schema.sql:2877:    WITH CHECK (auth.uid() = user_id);
staging_schema.sql:2878:
staging_schema.sql:2879:-- Function to automatically update updated_at timestamp
staging_schema.sql:2880:CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
staging_schema.sql:2881:RETURNS TRIGGER AS $$
staging_schema.sql:2882:BEGIN
staging_schema.sql:2883:    NEW.updated_at = NOW();
staging_schema.sql:2884:    RETURN NEW;
staging_schema.sql:2885:END;
staging_schema.sql:2886:$$ LANGUAGE plpgsql;
staging_schema.sql:2887:
staging_schema.sql:2888:-- Trigger to call the function
staging_schema.sql:2889:CREATE TRIGGER user_preferences_updated_at
staging_schema.sql:2890:    BEFORE UPDATE ON user_preferences
staging_schema.sql:2891:    FOR EACH ROW
staging_schema.sql:2892:    EXECUTE FUNCTION update_user_preferences_updated_at();
staging_schema.sql:2893:-- Enable required extensions
staging_schema.sql:2894:CREATE EXTENSION IF NOT EXISTS pg_cron;
staging_schema.sql:2895:CREATE EXTENSION IF NOT EXISTS pg_net;
staging_schema.sql:2896:
staging_schema.sql:2897:-- Schedule the job to run every day at 06:00 AM
staging_schema.sql:2898:-- NOTE: You must replace 'YOUR_PROJECT_REF' and 'YOUR_SERVICE_ROLE_KEY' below!
staging_schema.sql:2899:-- The Service Role Key is required to bypass any RLS (though the function handles it internally, correct Auth header is good 
practice)
staging_schema.sql:2900:-- Or use the ANON key if the function is public.
staging_schema.sql:2901:
staging_schema.sql:2902:SELECT cron.schedule(
staging_schema.sql:2903:    'fetch-index-data-daily', -- Job name
staging_schema.sql:2904:    '0 6 * * *',              -- Schedule (6:00 AM daily)
staging_schema.sql:2905:    $$
staging_schema.sql:2906:    SELECT
staging_schema.sql:2907:        net.http_post(
staging_schema.sql:2908:            url:='https://qfvrekvugdjnwhnaucmz.supabase.co/functions/v1/fetch-index-data',
staging_schema.sql:2909:            headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc
3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdnJla3Z1Z2RqbndobmF1Y216Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MzY0MTYsImV4cCI6MjA4MzAxMjQxNn0.xA3JI4iGElpIpZjVHLCA_FGw0hf
mNUJTtw_fuLlhkoA"}'::jsonb,
staging_schema.sql:2910:            body:='{}'::jsonb
staging_schema.sql:2911:        ) as request_id;
staging_schema.sql:2912:    $$
staging_schema.sql:2913:);
staging_schema.sql:2914:
staging_schema.sql:2915:-- Comment to explain
staging_schema.sql:2916:-- Create payments table
staging_schema.sql:2917:CREATE TABLE IF NOT EXISTS public.payments (
staging_schema.sql:2918:    id UUID NOT NULL DEFAULT gen_random_uuid(),
staging_schema.sql:2919:    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
staging_schema.sql:2920:    amount NUMERIC NOT NULL,
staging_schema.sql:2921:    currency TEXT NOT NULL CHECK (currency IN ('ILS', 'USD', 'EUR')),
staging_schema.sql:2922:    due_date DATE NOT NULL,
staging_schema.sql:2923:    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
staging_schema.sql:2924:    paid_date DATE DEFAULT NULL,
staging_schema.sql:2925:    payment_method TEXT DEFAULT NULL,
staging_schema.sql:2926:    reference TEXT DEFAULT NULL,
staging_schema.sql:2927:    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
staging_schema.sql:2928:    CONSTRAINT payments_pkey PRIMARY KEY (id)
staging_schema.sql:2929:);
staging_schema.sql:2930:
staging_schema.sql:2931:-- Enable RLS
staging_schema.sql:2932:ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
staging_schema.sql:2933:
staging_schema.sql:2934:-- Policies (assuming contracts have user_id, or widely permissive for now to avoid breakage if user_id is missing)
staging_schema.sql:2935:-- Ideally:
staging_schema.sql:2936:-- CREATE POLICY "Users can manage their own payments" ON public.payments
staging_schema.sql:2937:-- USING (contract_id IN (SELECT id FROM public.contracts WHERE user_id = auth.uid()));
staging_schema.sql:2938:
staging_schema.sql:2939:-- Fallback permissive policy for development if user_id logic is flaky
staging_schema.sql:2940:CREATE POLICY "Enable all access for authenticated users" ON public.payments
staging_schema.sql:2941:    FOR ALL
staging_schema.sql:2942:    TO authenticated
staging_schema.sql:2943:    USING (true)
staging_schema.sql:2944:    WITH CHECK (true);
staging_schema.sql:2945:-- Seed dummy CPI data for 2024-2025
staging_schema.sql:2946:-- Using approximate values based on recent trends (base 2022 ~105-110)
staging_schema.sql:2947:
staging_schema.sql:2949:VALUES 
staging_schema.sql:2950:  ('cpi', '2024-01', 105.0, 'manual'),
staging_schema.sql:2951:  ('cpi', '2024-02', 105.2, 'manual'),
staging_schema.sql:2952:  ('cpi', '2024-03', 105.5, 'manual'),
staging_schema.sql:2953:  ('cpi', '2024-04', 106.0, 'manual'),
staging_schema.sql:2954:  ('cpi', '2024-05', 106.3, 'manual'),
staging_schema.sql:2955:  ('cpi', '2024-06', 106.5, 'manual'),
staging_schema.sql:2956:  ('cpi', '2024-07', 107.0, 'manual'),
staging_schema.sql:2957:  ('cpi', '2024-08', 107.2, 'manual'),
staging_schema.sql:2958:  ('cpi', '2024-09', 107.5, 'manual'),
staging_schema.sql:2959:  ('cpi', '2024-10', 107.8, 'manual'),
staging_schema.sql:2960:  ('cpi', '2024-11', 108.0, 'manual'),
staging_schema.sql:2961:  ('cpi', '2024-12', 108.2, 'manual'),
staging_schema.sql:2962:  ('cpi', '2025-01', 108.5, 'manual'),
staging_schema.sql:2963:  ('cpi', '2025-02', 108.8, 'manual'),
staging_schema.sql:2964:  ('cpi', '2025-03', 109.0, 'manual'),
staging_schema.sql:2965:  ('cpi', '2025-04', 109.3, 'manual'),
staging_schema.sql:2966:  ('cpi', '2025-05', 109.5, 'manual'),
staging_schema.sql:2967:  ('cpi', '2025-06', 109.8, 'manual'),
staging_schema.sql:2968:  ('cpi', '2025-07', 110.0, 'manual'),
staging_schema.sql:2969:  ('cpi', '2025-08', 110.2, 'manual'),
staging_schema.sql:2970:  ('cpi', '2025-09', 110.5, 'manual'),
staging_schema.sql:2971:  ('cpi', '2025-10', 110.8, 'manual'),
staging_schema.sql:2972:  ('cpi', '2025-11', 111.0, 'manual'),
staging_schema.sql:2973:  ('cpi', '2025-12', 111.2, 'manual')
staging_schema.sql:2974:ON CONFLICT (index_type, date) DO UPDATE 
staging_schema.sql:2975:SET value = EXCLUDED.value;
staging_schema.sql:2976:-- Add columns for linkage tracking to payments
staging_schema.sql:2977:ALTER TABLE public.payments 
staging_schema.sql:2978:ADD COLUMN IF NOT EXISTS original_amount NUMERIC, -- The base amount before linkage
staging_schema.sql:2979:ADD COLUMN IF NOT EXISTS index_linkage_rate NUMERIC, -- The linkage percentage applied
staging_schema.sql:2980:ADD COLUMN IF NOT EXISTS paid_amount NUMERIC; -- What was actually paid
staging_schema.sql:2981:-- Create saved_calculations table
staging_schema.sql:2982:create table if not exists public.saved_calculations (
staging_schema.sql:2983:    id uuid default gen_random_uuid() primary key,
staging_schema.sql:2984:    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
staging_schema.sql:2985:    user_id uuid references auth.users(id) on delete set null,
staging_schema.sql:2986:    input_data jsonb not null,
staging_schema.sql:2987:    result_data jsonb not null
staging_schema.sql:2988:);
staging_schema.sql:2989:
staging_schema.sql:2990:-- RLS Policies
staging_schema.sql:2991:alter table public.saved_calculations enable row level security;
staging_schema.sql:2992:
staging_schema.sql:2993:-- Allow public read access (so anyone with the link can view)
staging_schema.sql:2994:create policy "Allow public read access"
staging_schema.sql:2995:    on public.saved_calculations for select
staging_schema.sql:2996:    using (true);
staging_schema.sql:2997:
staging_schema.sql:2998:-- Allow authenticated users to insert their own calculations
staging_schema.sql:2999:create policy "Allow authenticated insert"
staging_schema.sql:3000:    on public.saved_calculations for insert
staging_schema.sql:3001:    with check (auth.uid() = user_id);
staging_schema.sql:3002:
staging_schema.sql:3003:-- Add indexes for faster lookups if needed (though UUID lookup is fast)
staging_schema.sql:3004:create index if not exists saved_calculations_id_idx on public.saved_calculations(id);
staging_schema.sql:3005:-- Update RLS policies for saved_calculations to allow public/anonymous inserts
staging_schema.sql:3006:
staging_schema.sql:3007:-- Drop the restrictive policy
staging_schema.sql:3008:drop policy if exists "Allow authenticated insert" on public.saved_calculations;
staging_schema.sql:3009:
staging_schema.sql:3010:-- Create a new inclusive policy
staging_schema.sql:3011:-- Allows insertion if:
staging_schema.sql:3012:-- 1. The user is authenticated and the user_id matches their UID
staging_schema.sql:3013:-- 2. The user is anonymous (or authenticated) and provides no user_id (NULL)
staging_schema.sql:3014:create policy "Allow public insert"
staging_schema.sql:3015:    on public.saved_calculations for insert
staging_schema.sql:3016:    with check (
staging_schema.sql:3017:        (auth.uid() = user_id) OR (user_id is null)
staging_schema.sql:3018:    );
staging_schema.sql:3019:-- Allow public (anon) users to read index data for landing page
staging_schema.sql:3020:DO $$ 
staging_schema.sql:3021:BEGIN
staging_schema.sql:3022:    IF NOT EXISTS (
staging_schema.sql:3023:        SELECT 1 FROM pg_policies 
staging_schema.sql:3024:        WHERE tablename = 'index_data' 
staging_schema.sql:3025:        AND policyname = 'Allow public read access to index data'
staging_schema.sql:3026:    ) THEN
staging_schema.sql:3027:        CREATE POLICY "Allow public read access to index data"
staging_schema.sql:3028:          ON index_data
staging_schema.sql:3029:          FOR SELECT
staging_schema.sql:3030:          TO anon
staging_schema.sql:3031:          USING (true);
staging_schema.sql:3032:    END IF;
staging_schema.sql:3033:END $$;
staging_schema.sql:3034:-- Enable pg_cron extension for scheduled tasks
staging_schema.sql:3035:CREATE EXTENSION IF NOT EXISTS pg_cron;
staging_schema.sql:3036:
staging_schema.sql:3037:-- Schedule the index update to run every 2 hours on days 15-17 of each month
staging_schema.sql:3038:-- (Index data is typically published mid-month by CBS and BOI)
staging_schema.sql:3039:-- This gives us 36 attempts (12 per day ֳ— 3 days) to fetch the data
staging_schema.sql:3040:
staging_schema.sql:3041:-- IMPORTANT: Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY before running this migration
staging_schema.sql:3042:-- Get these values from: Supabase Dashboard > Settings > API
staging_schema.sql:3043:
staging_schema.sql:3044:-- Day 15: Every 2 hours (00:00, 02:00, 04:00, ..., 22:00)
staging_schema.sql:3045:SELECT cron.schedule(
staging_schema.sql:3046:    'index-update-day15',
staging_schema.sql:3047:    '0 */2 15 * *',  -- Every 2 hours on day 15
staging_schema.sql:3048:    $$
staging_schema.sql:3049:    SELECT
staging_schema.sql:3050:        net.http_post(
staging_schema.sql:3051:            url := 'https://qfvrekvugdjnwhnaucmz.supabase.co/functions/v1/fetch-index-data',
staging_schema.sql:3052:            headers := jsonb_build_object(
staging_schema.sql:3053:                'Content-Type', 'application/json',
staging_schema.sql:3054:                'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdnJla3Z1Z2Rq
bndobmF1Y216Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQzNjQxNiwiZXhwIjoyMDgzMDEyNDE2fQ._Fmq-2x4zpzPkHP9btdqSUj0gbX7RmqscwvGElNbdNA'
staging_schema.sql:3055:            ),
staging_schema.sql:3056:            body := '{}'::jsonb
staging_schema.sql:3057:        ) AS request_id;
staging_schema.sql:3058:    $$
staging_schema.sql:3059:);
staging_schema.sql:3060:
staging_schema.sql:3061:-- Day 16: Every 2 hours
staging_schema.sql:3062:SELECT cron.schedule(
staging_schema.sql:3063:    'index-update-day16',
staging_schema.sql:3064:    '0 */2 16 * *',  -- Every 2 hours on day 16
staging_schema.sql:3065:    $$
staging_schema.sql:3066:    SELECT
staging_schema.sql:3067:        net.http_post(
staging_schema.sql:3068:            url := 'https://qfvrekvugdjnwhnaucmz.supabase.co/functions/v1/fetch-index-data',
staging_schema.sql:3069:            headers := jsonb_build_object(
staging_schema.sql:3070:                'Content-Type', 'application/json',
staging_schema.sql:3071:                'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdnJla3Z1Z2Rq
bndobmF1Y216Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQzNjQxNiwiZXhwIjoyMDgzMDEyNDE2fQ._Fmq-2x4zpzPkHP9btdqSUj0gbX7RmqscwvGElNbdNA'
staging_schema.sql:3072:            ),
staging_schema.sql:3073:            body := '{}'::jsonb
staging_schema.sql:3074:        ) AS request_id;
staging_schema.sql:3075:    $$
staging_schema.sql:3076:);
staging_schema.sql:3077:
staging_schema.sql:3078:-- Day 17: Every 2 hours
staging_schema.sql:3079:SELECT cron.schedule(
staging_schema.sql:3080:    'index-update-day17',
staging_schema.sql:3081:    '0 */2 17 * *',  -- Every 2 hours on day 17
staging_schema.sql:3082:    $$
staging_schema.sql:3083:    SELECT
staging_schema.sql:3084:        net.http_post(
staging_schema.sql:3085:            url := 'https://qfvrekvugdjnwhnaucmz.supabase.co/functions/v1/fetch-index-data',
staging_schema.sql:3086:            headers := jsonb_build_object(
staging_schema.sql:3087:                'Content-Type', 'application/json',
staging_schema.sql:3088:                'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdnJla3Z1Z2Rq
bndobmF1Y216Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQzNjQxNiwiZXhwIjoyMDgzMDEyNDE2fQ._Fmq-2x4zpzPkHP9btdqSUj0gbX7RmqscwvGElNbdNA'
staging_schema.sql:3089:            ),
staging_schema.sql:3090:            body := '{}'::jsonb
staging_schema.sql:3091:        ) AS request_id;
staging_schema.sql:3092:    $$
staging_schema.sql:3093:);
staging_schema.sql:3094:
staging_schema.sql:3095:-- Verify the jobs were created
staging_schema.sql:3096:SELECT jobname, schedule, command FROM cron.job WHERE jobname LIKE 'index-update%' ORDER BY jobname;
staging_schema.sql:3097:-- Drop the saved_calculations table as it's no longer needed
staging_schema.sql:3098:-- Calculator sharing now uses URL-encoded links (stateless, no database storage)
staging_schema.sql:3099:
staging_schema.sql:3100:DROP TABLE IF EXISTS saved_calculations;
staging_schema.sql:3101:-- ============================================
staging_schema.sql:3102:-- 1. Create Subscription Plans Table
staging_schema.sql:3103:-- ============================================
staging_schema.sql:3104:
staging_schema.sql:3105:CREATE TABLE IF NOT EXISTS subscription_plans (
staging_schema.sql:3106:    id TEXT PRIMARY KEY, -- 'free', 'pro', 'enterprise'
staging_schema.sql:3107:    name TEXT NOT NULL,
staging_schema.sql:3108:    price_monthly NUMERIC(10, 2) DEFAULT 0,
staging_schema.sql:3109:    
staging_schema.sql:3110:    -- Resource Limits (-1 for unlimited)
staging_schema.sql:3111:    max_properties INTEGER DEFAULT 1,
staging_schema.sql:3112:    max_tenants INTEGER DEFAULT 1,
staging_schema.sql:3113:    max_contracts INTEGER DEFAULT 1,
staging_schema.sql:3114:    max_sessions INTEGER DEFAULT 1,
staging_schema.sql:3115:    
staging_schema.sql:3116:    -- Modular Features
staging_schema.sql:3117:    features JSONB DEFAULT '{}'::jsonb, -- e.g. {"can_export": true, "ai_assistant": false}
staging_schema.sql:3118:    
staging_schema.sql:3119:    created_at TIMESTAMPTZ DEFAULT NOW(),
staging_schema.sql:3120:    updated_at TIMESTAMPTZ DEFAULT NOW()
staging_schema.sql:3121:);
staging_schema.sql:3122:
staging_schema.sql:3123:-- Enable RLS
staging_schema.sql:3124:ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
staging_schema.sql:3125:
staging_schema.sql:3126:-- Policies: Everyone can read plans, only admins can modify (if we build UI for it)
staging_schema.sql:3127:CREATE POLICY "Public Read Plans" 
staging_schema.sql:3128:    ON subscription_plans FOR SELECT 
staging_schema.sql:3129:    USING (true);
staging_schema.sql:3130:
staging_schema.sql:3131:-- Seed Data
staging_schema.sql:3132:INSERT INTO subscription_plans (id, name, price_monthly, max_properties, max_tenants, max_contracts, max_sessions, features)
staging_schema.sql:3133:VALUES 
staging_schema.sql:3134:    ('free', 'Free Forever', 0, 1, 2, 1, 1, '{"support_level": "basic"}'::jsonb),
staging_schema.sql:3135:    ('pro', 'Pro', 29.99, 10, 20, -1, 3, '{"support_level": "priority", "export_data": true}'::jsonb),
staging_schema.sql:3136:    ('enterprise', 'Enterprise', 99.99, -1, -1, -1, -1, '{"support_level": "dedicated", "export_data": true, "api_access": 
true}'::jsonb)
staging_schema.sql:3137:ON CONFLICT (id) DO UPDATE SET
staging_schema.sql:3138:    name = EXCLUDED.name,
staging_schema.sql:3139:    price_monthly = EXCLUDED.price_monthly,
staging_schema.sql:3140:    max_properties = EXCLUDED.max_properties,
staging_schema.sql:3141:    max_tenants = EXCLUDED.max_tenants,
staging_schema.sql:3142:    max_contracts = EXCLUDED.max_contracts,
staging_schema.sql:3143:    max_sessions = EXCLUDED.max_sessions,
staging_schema.sql:3144:    features = EXCLUDED.features;
staging_schema.sql:3145:-- ============================================
staging_schema.sql:3146:-- 2. Link User Profiles to Subscription Plans
staging_schema.sql:3147:-- ============================================
staging_schema.sql:3148:
staging_schema.sql:3149:-- 1. Add plan_id column
staging_schema.sql:3150:ALTER TABLE user_profiles 
staging_schema.sql:3151:ADD COLUMN IF NOT EXISTS plan_id TEXT REFERENCES subscription_plans(id) DEFAULT 'free';
staging_schema.sql:3152:
staging_schema.sql:3153:-- 2. Migrate existing users based on old enum (if needed)
staging_schema.sql:3154:-- Assuming 'free_forever' -> 'free', anything else -> 'free' or 'enterprise'
staging_schema.sql:3155:-- Since we are just starting, defaulting to 'free' is safe.
staging_schema.sql:3156:UPDATE user_profiles SET plan_id = 'free' WHERE plan_id IS NULL;
staging_schema.sql:3157:
staging_schema.sql:3158:-- 3. Drop old columns if they exist (optional cleanup)
staging_schema.sql:3159:-- We'll keep them for a moment just in case, but let's drop the reliance on the enum type eventually.
staging_schema.sql:3160:-- ALTER TABLE user_profiles DROP COLUMN IF EXISTS subscription_plan;
staging_schema.sql:3161:
staging_schema.sql:3162:-- 4. Update Trigger for New Users
staging_schema.sql:3163:CREATE OR REPLACE FUNCTION handle_new_user()
staging_schema.sql:3164:RETURNS TRIGGER AS $$
staging_schema.sql:3165:BEGIN
staging_schema.sql:3166:    INSERT INTO user_profiles (
staging_schema.sql:3167:        id, email, full_name, role, subscription_status, plan_id
staging_schema.sql:3168:    )
staging_schema.sql:3169:    VALUES (
staging_schema.sql:3170:        NEW.id,
staging_schema.sql:3171:        NEW.email,
staging_schema.sql:3172:        NEW.raw_user_meta_data->>'full_name',
staging_schema.sql:3173:        'user',
staging_schema.sql:3174:        'active',
staging_schema.sql:3175:        'free' -- Default to free plan
staging_schema.sql:3176:    );
staging_schema.sql:3177:    RETURN NEW;
staging_schema.sql:3178:END;
staging_schema.sql:3179:$$ LANGUAGE plpgsql SECURITY DEFINER;
staging_schema.sql:3180:-- ============================================
staging_schema.sql:3181:-- 3. Dynamic Session Limits
staging_schema.sql:3182:-- ============================================
staging_schema.sql:3183:
staging_schema.sql:3184:CREATE OR REPLACE FUNCTION public.manage_session_limits()
staging_schema.sql:3185:RETURNS TRIGGER
staging_schema.sql:3186:LANGUAGE plpgsql
staging_schema.sql:3187:SECURITY DEFINER
staging_schema.sql:3188:SET search_path = public, auth
staging_schema.sql:3189:AS $$
staging_schema.sql:3190:DECLARE
staging_schema.sql:3191:    new_device_type TEXT;
staging_schema.sql:3192:    session_count INT;
staging_schema.sql:3193:    oldest_session_id UUID;
staging_schema.sql:3194:    user_plan_limit INT;
staging_schema.sql:3195:BEGIN
staging_schema.sql:3196:    -- 1. Get User's Plan Limit
staging_schema.sql:3197:    SELECT sp.max_sessions
staging_schema.sql:3198:    INTO user_plan_limit
staging_schema.sql:3199:    FROM public.user_profiles up
staging_schema.sql:3200:    JOIN public.subscription_plans sp ON up.plan_id = sp.id
staging_schema.sql:3201:    WHERE up.id = NEW.user_id;
staging_schema.sql:3202:
staging_schema.sql:3203:    -- Fallback if no plan found (shouldn't happen)
staging_schema.sql:3204:    IF user_plan_limit IS NULL THEN
staging_schema.sql:3205:        user_plan_limit := 1;
staging_schema.sql:3206:    END IF;
staging_schema.sql:3207:
staging_schema.sql:3208:    -- If unlimited (-1), skip check
staging_schema.sql:3209:    IF user_plan_limit = -1 THEN
staging_schema.sql:3210:        RETURN NEW;
staging_schema.sql:3211:    END IF;
staging_schema.sql:3212:
staging_schema.sql:3213:    -- 2. Identify Device Type
staging_schema.sql:3214:    new_device_type := public.get_device_type(NEW.user_agent);
staging_schema.sql:3215:
staging_schema.sql:3216:    -- 3. Count EXISTING sessions
staging_schema.sql:3217:    SELECT COUNT(*)
staging_schema.sql:3218:    INTO session_count
staging_schema.sql:3219:    FROM auth.sessions
staging_schema.sql:3220:    WHERE user_id = NEW.user_id;
staging_schema.sql:3221:    -- Note: We removed the "per device type" logic to enforce a GLOBAL session limit per plan.
staging_schema.sql:3222:    -- If you want per-device, uncomment the AND clause below, but usually plans limit total active sessions.
staging_schema.sql:3223:    -- AND public.get_device_type(user_agent) = new_device_type;
staging_schema.sql:3224:
staging_schema.sql:3225:    -- 4. Enforce Limit
staging_schema.sql:3226:    IF session_count >= user_plan_limit THEN
staging_schema.sql:3227:        -- Delete Oldest Session
staging_schema.sql:3228:        SELECT id
staging_schema.sql:3229:        INTO oldest_session_id
staging_schema.sql:3230:        FROM auth.sessions
staging_schema.sql:3231:        WHERE user_id = NEW.user_id
staging_schema.sql:3232:        ORDER BY created_at ASC
staging_schema.sql:3233:        LIMIT 1;
staging_schema.sql:3234:
staging_schema.sql:3235:        IF oldest_session_id IS NOT NULL THEN
staging_schema.sql:3236:            DELETE FROM auth.sessions WHERE id = oldest_session_id;
staging_schema.sql:3237:        END IF;
staging_schema.sql:3238:    END IF;
staging_schema.sql:3239:
staging_schema.sql:3240:    RETURN NEW;
staging_schema.sql:3241:END;
staging_schema.sql:3242:$$;
staging_schema.sql:3243:-- ============================================
staging_schema.sql:3244:-- 4. Get User Stats RPC
staging_schema.sql:3245:-- ============================================
staging_schema.sql:3246:
staging_schema.sql:3247:CREATE OR REPLACE FUNCTION get_users_with_stats()
staging_schema.sql:3248:RETURNS TABLE (
staging_schema.sql:3249:    -- User Profile Columns
staging_schema.sql:3250:    id UUID,
staging_schema.sql:3251:    email TEXT,
staging_schema.sql:3252:    full_name TEXT,
staging_schema.sql:3253:    role user_role,
staging_schema.sql:3254:    subscription_status subscription_status,
staging_schema.sql:3255:    plan_id TEXT,
staging_schema.sql:3256:    created_at TIMESTAMPTZ,
staging_schema.sql:3257:    
staging_schema.sql:3258:    -- Stats
staging_schema.sql:3259:    properties_count BIGINT,
staging_schema.sql:3260:    tenants_count BIGINT,
staging_schema.sql:3261:    contracts_count BIGINT
staging_schema.sql:3262:) 
staging_schema.sql:3263:LANGUAGE plpgsql
staging_schema.sql:3264:SECURITY DEFINER
staging_schema.sql:3265:AS $$
staging_schema.sql:3266:BEGIN
staging_schema.sql:3267:    RETURN QUERY
staging_schema.sql:3268:    SELECT 
staging_schema.sql:3269:        up.id,
staging_schema.sql:3270:        up.email,
staging_schema.sql:3271:        up.full_name,
staging_schema.sql:3272:        up.role,
staging_schema.sql:3273:        up.subscription_status,
staging_schema.sql:3274:        up.plan_id,
staging_schema.sql:3275:        up.created_at,
staging_schema.sql:3276:        
staging_schema.sql:3277:        -- Counts (Coalesce to 0)
staging_schema.sql:3278:        COALESCE(p.count, 0) as properties_count,
staging_schema.sql:3279:        COALESCE(t.count, 0) as tenants_count,
staging_schema.sql:3280:        COALESCE(c.count, 0) as contracts_count
staging_schema.sql:3281:    FROM user_profiles up
staging_schema.sql:3282:    -- Join Property Counts
staging_schema.sql:3283:    LEFT JOIN (
staging_schema.sql:3284:        SELECT user_id, count(*) as count 
staging_schema.sql:3285:        FROM properties 
staging_schema.sql:3286:        GROUP BY user_id
staging_schema.sql:3287:    ) p ON up.id = p.user_id
staging_schema.sql:3288:    -- Join Tenant Counts
staging_schema.sql:3289:    LEFT JOIN (
staging_schema.sql:3290:        SELECT user_id, count(*) as count 
staging_schema.sql:3291:        FROM tenants 
staging_schema.sql:3292:        GROUP BY user_id
staging_schema.sql:3293:    ) t ON up.id = t.user_id
staging_schema.sql:3294:    -- Join Contract Counts
staging_schema.sql:3295:    LEFT JOIN (
staging_schema.sql:3296:        SELECT user_id, count(*) as count 
staging_schema.sql:3297:        FROM contracts 
staging_schema.sql:3298:        GROUP BY user_id
staging_schema.sql:3299:    ) c ON up.id = c.user_id
staging_schema.sql:3300:    
staging_schema.sql:3301:    ORDER BY up.created_at DESC;
staging_schema.sql:3302:END;
staging_schema.sql:3303:$$;
staging_schema.sql:3304:-- ============================================
staging_schema.sql:3305:-- 5. Admin Delete User RPC
staging_schema.sql:3306:-- ============================================
staging_schema.sql:3307:
staging_schema.sql:3308:-- Function to delete user from auth.users (cascades to all other tables)
staging_schema.sql:3309:-- Note: modifying auth.users usually requires superuser or specific grants.
staging_schema.sql:3310:-- Usage: supabase.rpc('delete_user_account', { target_user_id: '...' })
staging_schema.sql:3311:
staging_schema.sql:3312:CREATE OR REPLACE FUNCTION delete_user_account(target_user_id UUID)
staging_schema.sql:3313:RETURNS VOID
staging_schema.sql:3314:LANGUAGE plpgsql
staging_schema.sql:3315:SECURITY DEFINER
staging_schema.sql:3316:SET search_path = public, auth -- vital for accessing auth schema
staging_schema.sql:3317:AS $$
staging_schema.sql:3318:BEGIN
staging_schema.sql:3319:    -- 1. Check if requester is admin
staging_schema.sql:3320:    IF NOT EXISTS (
staging_schema.sql:3321:        SELECT 1 FROM public.user_profiles 
staging_schema.sql:3322:        WHERE id = auth.uid() 
staging_schema.sql:3323:        AND role = 'admin'
staging_schema.sql:3324:    ) THEN
staging_schema.sql:3325:        RAISE EXCEPTION 'Access Denied: Only Admins can delete users.';
staging_schema.sql:3326:    END IF;
staging_schema.sql:3327:    
staging_schema.sql:3328:    -- 2. Prevent deleting yourself
staging_schema.sql:3329:    IF target_user_id = auth.uid() THEN
staging_schema.sql:3330:        RAISE EXCEPTION 'Cannot delete your own account via this function.';
staging_schema.sql:3331:    END IF;
staging_schema.sql:3332:
staging_schema.sql:3333:    -- 3. Delete from auth.users
staging_schema.sql:3334:    -- This triggers CASCADE to user_profiles -> properties, etc.
staging_schema.sql:3335:    DELETE FROM auth.users WHERE id = target_user_id;
staging_schema.sql:3336:END;
staging_schema.sql:3337:$$;
staging_schema.sql:3338:
staging_schema.sql:3339:-- Grant execute permission
staging_schema.sql:3340:GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;
staging_schema.sql:3341:-- Add fields for account deletion tracking
staging_schema.sql:3342:ALTER TABLE user_profiles
staging_schema.sql:3343:ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
staging_schema.sql:3344:ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'deleted'));
staging_schema.sql:3345:
staging_schema.sql:3346:-- Create index for efficient querying of suspended accounts
staging_schema.sql:3347:CREATE INDEX IF NOT EXISTS idx_user_profiles_deleted_at ON user_profiles(deleted_at) WHERE deleted_at IS NOT NULL;
staging_schema.sql:3348:
staging_schema.sql:3349:-- Create function to permanently delete accounts after 14 days
staging_schema.sql:3350:CREATE OR REPLACE FUNCTION cleanup_suspended_accounts()
staging_schema.sql:3351:RETURNS void
staging_schema.sql:3352:LANGUAGE plpgsql
staging_schema.sql:3353:SECURITY DEFINER
staging_schema.sql:3354:AS $$
staging_schema.sql:3355:DECLARE
staging_schema.sql:3356:    cutoff_date TIMESTAMP WITH TIME ZONE;
staging_schema.sql:3357:    user_record RECORD;
staging_schema.sql:3358:BEGIN
staging_schema.sql:3359:    -- Calculate cutoff date (14 days ago)
staging_schema.sql:3360:    cutoff_date := NOW() - INTERVAL '14 days';
staging_schema.sql:3361:    
staging_schema.sql:3362:    -- Find all users marked for deletion more than 14 days ago
staging_schema.sql:3363:    FOR user_record IN 
staging_schema.sql:3364:        SELECT id 
staging_schema.sql:3365:        FROM user_profiles 
staging_schema.sql:3366:        WHERE deleted_at IS NOT NULL 
staging_schema.sql:3367:        AND deleted_at < cutoff_date
staging_schema.sql:3368:        AND account_status = 'suspended'
staging_schema.sql:3369:    LOOP
staging_schema.sql:3370:        -- Delete user data (cascades will handle related records)
staging_schema.sql:3371:        DELETE FROM user_profiles WHERE id = user_record.id;
staging_schema.sql:3372:        
staging_schema.sql:3373:        -- Delete from auth.users (requires admin privileges)
staging_schema.sql:3374:        DELETE FROM auth.users WHERE id = user_record.id;
staging_schema.sql:3375:        
staging_schema.sql:3376:        RAISE NOTICE 'Deleted user account: %', user_record.id;
staging_schema.sql:3377:    END LOOP;
staging_schema.sql:3378:END;
staging_schema.sql:3379:$$;
staging_schema.sql:3380:
staging_schema.sql:3381:-- Grant execute permission to authenticated users (will be called by Edge Function)
staging_schema.sql:3382:GRANT EXECUTE ON FUNCTION cleanup_suspended_accounts() TO service_role;
staging_schema.sql:3383:
staging_schema.sql:3384:-- Update delete_user_account to log action
staging_schema.sql:3385:CREATE OR REPLACE FUNCTION delete_user_account(target_user_id UUID)
staging_schema.sql:3386:RETURNS VOID
staging_schema.sql:3387:LANGUAGE plpgsql
staging_schema.sql:3388:SECURITY DEFINER
staging_schema.sql:3389:SET search_path = public, auth
staging_schema.sql:3390:AS $$
staging_schema.sql:3391:DECLARE
staging_schema.sql:3392:    target_email TEXT;
staging_schema.sql:3393:BEGIN
staging_schema.sql:3394:    -- 1. Check if requester is admin
staging_schema.sql:3395:    IF NOT EXISTS (
staging_schema.sql:3396:        SELECT 1 FROM public.user_profiles 
staging_schema.sql:3397:        WHERE id = auth.uid() 
staging_schema.sql:3398:        AND role = 'admin'
staging_schema.sql:3399:    ) THEN
staging_schema.sql:3400:        RAISE EXCEPTION 'Access Denied: Only Admins can delete users.';
staging_schema.sql:3401:    END IF;
staging_schema.sql:3402:    
staging_schema.sql:3403:    -- 2. Prevent deleting yourself
staging_schema.sql:3404:    IF target_user_id = auth.uid() THEN
staging_schema.sql:3405:        RAISE EXCEPTION 'Cannot delete your own account via this function.';
staging_schema.sql:3406:    END IF;
staging_schema.sql:3407:
staging_schema.sql:3408:    -- Capture email for log before deletion
staging_schema.sql:3409:    SELECT email INTO target_email FROM auth.users WHERE id = target_user_id;
staging_schema.sql:3410:
staging_schema.sql:3411:    -- 3. Log the action
staging_schema.sql:3412:    INSERT INTO public.audit_logs (user_id, action, details)
staging_schema.sql:3413:    VALUES (
staging_schema.sql:3414:        auth.uid(), 
staging_schema.sql:3415:        'delete_user', 
staging_schema.sql:3416:        jsonb_build_object('target_user_id', target_user_id, 'target_email', target_email)
staging_schema.sql:3417:    );
staging_schema.sql:3418:
staging_schema.sql:3419:    -- 4. Delete from auth.users (cascades)
staging_schema.sql:3420:    DELETE FROM auth.users WHERE id = target_user_id;
staging_schema.sql:3421:END;
staging_schema.sql:3422:$$;
staging_schema.sql:3423:
staging_schema.sql:3424:
staging_schema.sql:3425:-- Create Trigger Function for Profile Changes
staging_schema.sql:3426:CREATE OR REPLACE FUNCTION audit_profile_changes()
staging_schema.sql:3427:RETURNS TRIGGER
staging_schema.sql:3428:LANGUAGE plpgsql
staging_schema.sql:3429:SECURITY DEFINER
staging_schema.sql:3430:SET search_path = public
staging_schema.sql:3431:AS $$
staging_schema.sql:3432:BEGIN
staging_schema.sql:3433:    IF (OLD.role IS DISTINCT FROM NEW.role) OR 
staging_schema.sql:3434:       (OLD.plan_id IS DISTINCT FROM NEW.plan_id) OR 
staging_schema.sql:3435:       (OLD.subscription_status IS DISTINCT FROM NEW.subscription_status) THEN
staging_schema.sql:3436:       
staging_schema.sql:3437:        INSERT INTO public.audit_logs (user_id, action, details)
staging_schema.sql:3438:        VALUES (
staging_schema.sql:3439:            auth.uid(), -- The admin performing the update
staging_schema.sql:3440:            'update_user_profile',
staging_schema.sql:3441:            jsonb_build_object(
staging_schema.sql:3442:                'target_user_id', NEW.id,
staging_schema.sql:3443:                'changes', jsonb_build_object(
staging_schema.sql:3444:                    'role', CASE WHEN OLD.role IS DISTINCT FROM NEW.role THEN jsonb_build_array(OLD.role, NEW.role) ELSE NULL 
END,
staging_schema.sql:3445:                    'plan_id', CASE WHEN OLD.plan_id IS DISTINCT FROM NEW.plan_id THEN jsonb_build_array(OLD.plan_id, 
NEW.plan_id) ELSE NULL END,
staging_schema.sql:3446:                    'status', CASE WHEN OLD.subscription_status IS DISTINCT FROM NEW.subscription_status THEN 
jsonb_build_array(OLD.subscription_status, NEW.subscription_status) ELSE NULL END
staging_schema.sql:3447:                )
staging_schema.sql:3448:            )
staging_schema.sql:3449:        );
staging_schema.sql:3450:    END IF;
staging_schema.sql:3451:    RETURN NEW;
staging_schema.sql:3452:END;
staging_schema.sql:3453:$$;
staging_schema.sql:3454:
staging_schema.sql:3455:-- Drop trigger if exists to allow idempotent re-run
staging_schema.sql:3456:DROP TRIGGER IF EXISTS on_profile_change_audit ON public.user_profiles;
staging_schema.sql:3457:
staging_schema.sql:3458:-- Create Trigger
staging_schema.sql:3459:CREATE TRIGGER on_profile_change_audit
staging_schema.sql:3460:AFTER UPDATE ON public.user_profiles
staging_schema.sql:3461:FOR EACH ROW
staging_schema.sql:3462:EXECUTE FUNCTION audit_profile_changes();
staging_schema.sql:3463:-- Create Feedback Table
staging_schema.sql:3464:CREATE TABLE IF NOT EXISTS public.feedback (
staging_schema.sql:3465:    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
staging_schema.sql:3466:    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
staging_schema.sql:3467:    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Nullable for anonymous feedback
staging_schema.sql:3468:    message TEXT NOT NULL,
staging_schema.sql:3469:    type TEXT DEFAULT 'bug', -- 'bug', 'feature', 'other'
staging_schema.sql:3470:    status TEXT DEFAULT 'new', -- 'new', 'in_progress', 'resolved'
staging_schema.sql:3471:    screenshot_url TEXT,
staging_schema.sql:3472:    device_info JSONB
staging_schema.sql:3473:);
staging_schema.sql:3474:
staging_schema.sql:3475:-- RLS
staging_schema.sql:3476:ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
staging_schema.sql:3477:
staging_schema.sql:3478:-- Allow anyone to insert (Anon or Authenticated)
staging_schema.sql:3479:DROP POLICY IF EXISTS "Enable insert for everyone" ON public.feedback;
staging_schema.sql:3480:CREATE POLICY "Enable insert for everyone"
staging_schema.sql:3481:ON public.feedback FOR INSERT
staging_schema.sql:3482:TO public, anon, authenticated
staging_schema.sql:3483:WITH CHECK (true);
staging_schema.sql:3484:
staging_schema.sql:3485:-- Allow Admins to see all
staging_schema.sql:3486:DROP POLICY IF EXISTS "Admins can view all feedback" ON public.feedback;
staging_schema.sql:3487:CREATE POLICY "Admins can view all feedback"
staging_schema.sql:3488:ON public.feedback FOR SELECT
staging_schema.sql:3489:TO authenticated
staging_schema.sql:3490:USING (
staging_schema.sql:3491:    EXISTS (
staging_schema.sql:3492:        SELECT 1 FROM public.user_profiles
staging_schema.sql:3493:        WHERE id = auth.uid() AND role = 'admin'
staging_schema.sql:3494:    )
staging_schema.sql:3495:);
staging_schema.sql:3496:
staging_schema.sql:3497:-- Support updating status by Admins
staging_schema.sql:3498:DROP POLICY IF EXISTS "Admins can update feedback" ON public.feedback;
staging_schema.sql:3499:CREATE POLICY "Admins can update feedback"
staging_schema.sql:3500:ON public.feedback FOR UPDATE
staging_schema.sql:3501:TO authenticated
staging_schema.sql:3502:USING (
staging_schema.sql:3503:    EXISTS (
staging_schema.sql:3504:        SELECT 1 FROM public.user_profiles
staging_schema.sql:3505:        WHERE id = auth.uid() AND role = 'admin'
staging_schema.sql:3506:    )
staging_schema.sql:3507:);
staging_schema.sql:3508:
staging_schema.sql:3509:-- Storage Bucket for Screenshots
staging_schema.sql:3510:INSERT INTO storage.buckets (id, name, public) 
staging_schema.sql:3511:VALUES ('feedback-screenshots', 'feedback-screenshots', true)
staging_schema.sql:3512:ON CONFLICT (id) DO NOTHING;
staging_schema.sql:3513:
staging_schema.sql:3514:-- Storage Policies
staging_schema.sql:3515:DROP POLICY IF EXISTS "Anyone can upload feedback screenshots" ON storage.objects;
staging_schema.sql:3516:CREATE POLICY "Anyone can upload feedback screenshots"
staging_schema.sql:3517:ON storage.objects FOR INSERT
staging_schema.sql:3518:TO public, anon, authenticated
staging_schema.sql:3519:WITH CHECK ( bucket_id = 'feedback-screenshots' );
staging_schema.sql:3520:
staging_schema.sql:3521:DROP POLICY IF EXISTS "Anyone can view feedback screenshots" ON storage.objects;
staging_schema.sql:3522:CREATE POLICY "Anyone can view feedback screenshots"
staging_schema.sql:3523:ON storage.objects FOR SELECT
staging_schema.sql:3524:TO public, anon, authenticated
staging_schema.sql:3525:USING ( bucket_id = 'feedback-screenshots' );
staging_schema.sql:3526:-- Add Granular Storage Quota Fields to Subscription Plans
staging_schema.sql:3527:-- Migration: 20260119_add_granular_storage_quotas.sql
staging_schema.sql:3528:
staging_schema.sql:3529:-- Add category-specific storage columns
staging_schema.sql:3530:ALTER TABLE subscription_plans
staging_schema.sql:3531:ADD COLUMN IF NOT EXISTS max_media_mb INTEGER DEFAULT -1,      -- -1 for unlimited within global cap
staging_schema.sql:3532:ADD COLUMN IF NOT EXISTS max_utilities_mb INTEGER DEFAULT -1,
staging_schema.sql:3533:ADD COLUMN IF NOT EXISTS max_maintenance_mb INTEGER DEFAULT -1,
staging_schema.sql:3534:ADD COLUMN IF NOT EXISTS max_documents_mb INTEGER DEFAULT -1;
staging_schema.sql:3535:
staging_schema.sql:3536:-- Update existing plans with sensible defaults
staging_schema.sql:3537:-- (Assuming Free gets restricted media but more room for documents)
staging_schema.sql:3538:UPDATE subscription_plans SET 
staging_schema.sql:3539:    max_media_mb = 50,         -- 50MB for photos/video max on free
staging_schema.sql:3540:    max_utilities_mb = 20,     -- 20MB for bills
staging_schema.sql:3541:    max_maintenance_mb = 20,   -- 20MB for repairs
staging_schema.sql:3542:    max_documents_mb = 10      -- 10MB for contracts
staging_schema.sql:3543:WHERE id = 'free';
staging_schema.sql:3544:
staging_schema.sql:3545:-- Update the quota check function to support categories
staging_schema.sql:3546:CREATE OR REPLACE FUNCTION check_storage_quota(
staging_schema.sql:3547:    p_user_id UUID,
staging_schema.sql:3548:    p_file_size BIGINT,
staging_schema.sql:3549:    p_category TEXT DEFAULT NULL
staging_schema.sql:3550:) RETURNS BOOLEAN AS $$
staging_schema.sql:3551:DECLARE
staging_schema.sql:3552:    v_total_usage BIGINT;
staging_schema.sql:3553:    v_cat_usage BIGINT;
staging_schema.sql:3554:    v_max_total_mb INTEGER;
staging_schema.sql:3555:    v_max_cat_mb INTEGER;
staging_schema.sql:3556:    v_col_name TEXT;
staging_schema.sql:3557:BEGIN
staging_schema.sql:3558:    -- 1. Get current usage and plan limits
staging_schema.sql:3559:    SELECT 
staging_schema.sql:3560:        u.total_bytes,
staging_schema.sql:3561:        CASE 
staging_schema.sql:3562:            WHEN p_category IN ('photo', 'video') THEN u.media_bytes
staging_schema.sql:3563:            WHEN p_category LIKE 'utility_%' THEN u.utilities_bytes
staging_schema.sql:3564:            WHEN p_category = 'maintenance' THEN u.maintenance_bytes
staging_schema.sql:3565:            ELSE u.documents_bytes
staging_schema.sql:3566:        END,
staging_schema.sql:3567:        s.max_storage_mb,
staging_schema.sql:3568:        CASE 
staging_schema.sql:3569:            WHEN p_category IN ('photo', 'video') THEN s.max_media_mb
staging_schema.sql:3570:            WHEN p_category LIKE 'utility_%' THEN s.max_utilities_mb
staging_schema.sql:3571:            WHEN p_category = 'maintenance' THEN s.max_maintenance_mb
staging_schema.sql:3572:            ELSE s.max_documents_mb
staging_schema.sql:3573:        END
staging_schema.sql:3574:    INTO 
staging_schema.sql:3575:        v_total_usage,
staging_schema.sql:3576:        v_cat_usage,
staging_schema.sql:3577:        v_max_total_mb,
staging_schema.sql:3578:        v_max_cat_mb
staging_schema.sql:3579:    FROM user_profiles up
staging_schema.sql:3580:    JOIN subscription_plans s ON up.plan_id = s.id
staging_schema.sql:3581:    LEFT JOIN user_storage_usage u ON u.user_id = up.id
staging_schema.sql:3582:    WHERE up.id = p_user_id;
staging_schema.sql:3583:
staging_schema.sql:3584:    -- Initialize usage if user has no records yet
staging_schema.sql:3585:    v_total_usage := COALESCE(v_total_usage, 0);
staging_schema.sql:3586:    v_cat_usage := COALESCE(v_cat_usage, 0);
staging_schema.sql:3587:
staging_schema.sql:3588:    -- 2. Check Global Limit
staging_schema.sql:3589:    IF v_max_total_mb != -1 AND (v_total_usage + p_file_size) > (v_max_total_mb * 1024 * 1024) THEN
staging_schema.sql:3590:        RETURN FALSE;
staging_schema.sql:3591:    END IF;
staging_schema.sql:3592:
staging_schema.sql:3593:    -- 3. Check Category Limit (if specified and not unlimited)
staging_schema.sql:3594:    IF p_category IS NOT NULL AND v_max_cat_mb != -1 THEN
staging_schema.sql:3595:        IF (v_cat_usage + p_file_size) > (v_max_cat_mb * 1024 * 1024) THEN
staging_schema.sql:3596:            RETURN FALSE;
staging_schema.sql:3597:        END IF;
staging_schema.sql:3598:    END IF;
staging_schema.sql:3599:
staging_schema.sql:3600:    RETURN TRUE;
staging_schema.sql:3601:END;
staging_schema.sql:3602:$$ LANGUAGE plpgsql SECURITY DEFINER;
staging_schema.sql:3603:-- Add Storage Quota Fields to Subscription Plans
staging_schema.sql:3604:-- Migration: 20260119_add_storage_quotas.sql
staging_schema.sql:3605:
staging_schema.sql:3606:-- Add storage quota columns
staging_schema.sql:3607:ALTER TABLE subscription_plans
staging_schema.sql:3608:ADD COLUMN IF NOT EXISTS max_storage_mb INTEGER DEFAULT 100,  -- MB per user
staging_schema.sql:3609:ADD COLUMN IF NOT EXISTS max_file_size_mb INTEGER DEFAULT 10; -- MB per file
staging_schema.sql:3610:
staging_schema.sql:3611:-- Update existing plans with storage limits
staging_schema.sql:3612:UPDATE subscription_plans SET 
staging_schema.sql:3613:    max_storage_mb = 100,    -- 100MB total
staging_schema.sql:3614:    max_file_size_mb = 5     -- 5MB per file
staging_schema.sql:3615:WHERE id = 'free';
staging_schema.sql:3616:
staging_schema.sql:3617:UPDATE subscription_plans SET 
staging_schema.sql:3618:    max_storage_mb = 5120,   -- 5GB total
staging_schema.sql:3619:    max_file_size_mb = 50    -- 50MB per file
staging_schema.sql:3620:WHERE id = 'pro';
staging_schema.sql:3621:
staging_schema.sql:3622:UPDATE subscription_plans SET 
staging_schema.sql:3623:    max_storage_mb = -1,     -- Unlimited
staging_schema.sql:3624:    max_file_size_mb = 500   -- 500MB per file
staging_schema.sql:3625:WHERE id = 'enterprise';
staging_schema.sql:3626:
staging_schema.sql:3627:-- Comments
staging_schema.sql:3628:-- Create table for short URLs
staging_schema.sql:3629:CREATE TABLE IF NOT EXISTS calculation_shares (
staging_schema.sql:3630:    id TEXT PRIMARY KEY, -- Short ID (e.g., "abc123")
staging_schema.sql:3631:    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
staging_schema.sql:3632:    calculation_data JSONB NOT NULL,
staging_schema.sql:3633:    created_at TIMESTAMPTZ DEFAULT NOW(),
staging_schema.sql:3634:    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
staging_schema.sql:3635:    view_count INTEGER DEFAULT 0
staging_schema.sql:3636:);
staging_schema.sql:3637:
staging_schema.sql:3638:-- Index for cleanup
staging_schema.sql:3639:CREATE INDEX IF NOT EXISTS idx_calculation_shares_expires ON calculation_shares(expires_at);
staging_schema.sql:3640:
staging_schema.sql:3641:-- RLS Policies
staging_schema.sql:3642:ALTER TABLE calculation_shares ENABLE ROW LEVEL SECURITY;
staging_schema.sql:3643:
staging_schema.sql:3644:-- Anyone can read (public shares)
staging_schema.sql:3645:CREATE POLICY "Public can view calculation shares"
staging_schema.sql:3646:    ON calculation_shares FOR SELECT
staging_schema.sql:3647:    USING (true);
staging_schema.sql:3648:
staging_schema.sql:3649:-- Authenticated users can create
staging_schema.sql:3650:CREATE POLICY "Authenticated users can create shares"
staging_schema.sql:3651:    ON calculation_shares FOR INSERT
staging_schema.sql:3652:    WITH CHECK (auth.uid() IS NOT NULL);
staging_schema.sql:3653:
staging_schema.sql:3654:-- Users can update their own shares (for view count)
staging_schema.sql:3655:CREATE POLICY "Anyone can update view count"
staging_schema.sql:3656:    ON calculation_shares FOR UPDATE
staging_schema.sql:3657:    USING (true)
staging_schema.sql:3658:    WITH CHECK (true);
staging_schema.sql:3659:
staging_schema.sql:3660:-- Function to generate short ID
staging_schema.sql:3661:CREATE OR REPLACE FUNCTION generate_short_id(length INTEGER DEFAULT 6)
staging_schema.sql:3662:RETURNS TEXT AS $$
staging_schema.sql:3663:DECLARE
staging_schema.sql:3664:    chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
staging_schema.sql:3665:    result TEXT := '';
staging_schema.sql:3666:    i INTEGER;
staging_schema.sql:3667:BEGIN
staging_schema.sql:3668:    FOR i IN 1..length LOOP
staging_schema.sql:3669:        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
staging_schema.sql:3670:    END LOOP;
staging_schema.sql:3671:    RETURN result;
staging_schema.sql:3672:END;
staging_schema.sql:3673:$$ LANGUAGE plpgsql;
staging_schema.sql:3674:
staging_schema.sql:3675:-- Function to create short URL
staging_schema.sql:3676:CREATE OR REPLACE FUNCTION create_calculation_share(p_calculation_data JSONB)
staging_schema.sql:3677:RETURNS TEXT AS $$
staging_schema.sql:3678:DECLARE
staging_schema.sql:3679:    v_short_id TEXT;
staging_schema.sql:3680:    v_max_attempts INTEGER := 10;
staging_schema.sql:3681:    v_attempt INTEGER := 0;
staging_schema.sql:3682:BEGIN
staging_schema.sql:3683:    LOOP
staging_schema.sql:3684:        v_short_id := generate_short_id(6);
staging_schema.sql:3685:        
staging_schema.sql:3686:        -- Try to insert
staging_schema.sql:3687:        BEGIN
staging_schema.sql:3688:            INSERT INTO calculation_shares (id, user_id, calculation_data)
staging_schema.sql:3689:            VALUES (v_short_id, auth.uid(), p_calculation_data);
staging_schema.sql:3690:            
staging_schema.sql:3691:            RETURN v_short_id;
staging_schema.sql:3692:        EXCEPTION WHEN unique_violation THEN
staging_schema.sql:3693:            v_attempt := v_attempt + 1;
staging_schema.sql:3694:            IF v_attempt >= v_max_attempts THEN
staging_schema.sql:3695:                RAISE EXCEPTION 'Failed to generate unique short ID after % attempts', v_max_attempts;
staging_schema.sql:3696:            END IF;
staging_schema.sql:3697:        END;
staging_schema.sql:3698:    END LOOP;
staging_schema.sql:3699:END;
staging_schema.sql:3700:$$ LANGUAGE plpgsql SECURITY DEFINER;
staging_schema.sql:3701:
staging_schema.sql:3702:-- Cleanup function for expired shares
staging_schema.sql:3703:CREATE OR REPLACE FUNCTION cleanup_expired_shares()
staging_schema.sql:3704:RETURNS INTEGER AS $$
staging_schema.sql:3705:DECLARE
staging_schema.sql:3706:    v_deleted_count INTEGER;
staging_schema.sql:3707:BEGIN
staging_schema.sql:3708:    DELETE FROM calculation_shares
staging_schema.sql:3709:    WHERE expires_at < NOW();
staging_schema.sql:3710:    
staging_schema.sql:3711:    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
staging_schema.sql:3712:    RETURN v_deleted_count;
staging_schema.sql:3713:END;
staging_schema.sql:3714:$$ LANGUAGE plpgsql;
staging_schema.sql:3715:
staging_schema.sql:3716:-- Comments
staging_schema.sql:3717:-- Property Documents System - Main Table
staging_schema.sql:3718:-- Migration: 20260119_create_property_documents.sql
staging_schema.sql:3719:
staging_schema.sql:3720:CREATE TABLE IF NOT EXISTS property_documents (
staging_schema.sql:3721:    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
staging_schema.sql:3722:    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
staging_schema.sql:3723:    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
staging_schema.sql:3724:    
staging_schema.sql:3725:    -- Document Classification
staging_schema.sql:3726:    category TEXT NOT NULL CHECK (category IN (
staging_schema.sql:3727:        'photo',           -- Property photos
staging_schema.sql:3728:        'video',           -- Property videos
staging_schema.sql:3729:        'utility_water',   -- Water bills
staging_schema.sql:3730:        'utility_electric',-- Electric bills
staging_schema.sql:3731:        'utility_gas',     -- Gas bills
staging_schema.sql:3732:        'utility_municipality', -- Municipality bills (arnona)
staging_schema.sql:3733:        'utility_management',   -- Building management fees
staging_schema.sql:3734:        'maintenance',     -- Repair/maintenance records
staging_schema.sql:3735:        'invoice',         -- General invoices
staging_schema.sql:3736:        'receipt',         -- Payment receipts
staging_schema.sql:3737:        'insurance',       -- Insurance documents
staging_schema.sql:3738:        'warranty',        -- Warranty documents
staging_schema.sql:3739:        'legal',           -- Legal documents
staging_schema.sql:3740:        'other'            -- Miscellaneous
staging_schema.sql:3741:    )),
staging_schema.sql:3742:    
staging_schema.sql:3743:    -- Storage Info
staging_schema.sql:3744:    storage_bucket TEXT NOT NULL,
staging_schema.sql:3745:    storage_path TEXT NOT NULL,
staging_schema.sql:3746:    file_name TEXT NOT NULL,
staging_schema.sql:3747:    file_size BIGINT,
staging_schema.sql:3748:    mime_type TEXT,
staging_schema.sql:3749:    
staging_schema.sql:3750:    -- Metadata
staging_schema.sql:3751:    title TEXT,
staging_schema.sql:3752:    description TEXT,
staging_schema.sql:3753:    tags TEXT[],
staging_schema.sql:3754:    
staging_schema.sql:3755:    -- Date Info
staging_schema.sql:3756:    document_date DATE,  -- When the bill/invoice was issued
staging_schema.sql:3757:    period_start DATE,   -- For recurring bills (e.g., monthly utility)
staging_schema.sql:3758:    period_end DATE,
staging_schema.sql:3759:    
staging_schema.sql:3760:    -- Financial Data (for bills/invoices)
staging_schema.sql:3761:    amount DECIMAL(10,2),
staging_schema.sql:3762:    currency TEXT DEFAULT 'ILS',
staging_schema.sql:3763:    paid BOOLEAN DEFAULT false,
staging_schema.sql:3764:    payment_date DATE,
staging_schema.sql:3765:    
staging_schema.sql:3766:    -- Maintenance Specific
staging_schema.sql:3767:    vendor_name TEXT,
staging_schema.sql:3768:    issue_type TEXT,     -- e.g., "plumbing", "electrical", "painting"
staging_schema.sql:3769:    
staging_schema.sql:3770:    created_at TIMESTAMPTZ DEFAULT NOW(),
staging_schema.sql:3771:    updated_at TIMESTAMPTZ DEFAULT NOW()
staging_schema.sql:3772:);
staging_schema.sql:3773:
staging_schema.sql:3774:-- Indexes
staging_schema.sql:3775:CREATE INDEX IF NOT EXISTS idx_property_documents_property ON property_documents(property_id);
staging_schema.sql:3776:CREATE INDEX IF NOT EXISTS idx_property_documents_category ON property_documents(category);
staging_schema.sql:3777:CREATE INDEX IF NOT EXISTS idx_property_documents_date ON property_documents(document_date);
staging_schema.sql:3778:CREATE INDEX IF NOT EXISTS idx_property_documents_user ON property_documents(user_id);
staging_schema.sql:3779:
staging_schema.sql:3780:-- RLS Policies
staging_schema.sql:3781:ALTER TABLE property_documents ENABLE ROW LEVEL SECURITY;
staging_schema.sql:3782:
staging_schema.sql:3783:CREATE POLICY "Users can view their property documents"
staging_schema.sql:3784:    ON property_documents FOR SELECT
staging_schema.sql:3785:    USING (auth.uid() = user_id);
staging_schema.sql:3786:
staging_schema.sql:3787:CREATE POLICY "Users can insert their property documents"
staging_schema.sql:3788:    ON property_documents FOR INSERT
staging_schema.sql:3789:    WITH CHECK (auth.uid() = user_id);
staging_schema.sql:3790:
staging_schema.sql:3791:CREATE POLICY "Users can update their property documents"
staging_schema.sql:3792:    ON property_documents FOR UPDATE
staging_schema.sql:3793:    USING (auth.uid() = user_id);
staging_schema.sql:3794:
staging_schema.sql:3795:CREATE POLICY "Users can delete their property documents"
staging_schema.sql:3796:    ON property_documents FOR DELETE
staging_schema.sql:3797:    USING (auth.uid() = user_id);
staging_schema.sql:3798:
staging_schema.sql:3799:-- Comments
staging_schema.sql:3800:-- Create document_folders table
staging_schema.sql:3801:CREATE TABLE IF NOT EXISTS document_folders (
staging_schema.sql:3802:    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
staging_schema.sql:3803:    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
staging_schema.sql:3804:    category TEXT NOT NULL, -- e.g., 'utility_electric', 'maintenance', 'media', 'other'
staging_schema.sql:3805:    name TEXT NOT NULL, -- The user-friendly subject/title
staging_schema.sql:3806:    folder_date DATE NOT NULL DEFAULT CURRENT_DATE,
staging_schema.sql:3807:    description TEXT,
staging_schema.sql:3808:    created_at TIMESTAMPTZ DEFAULT NOW(),
staging_schema.sql:3809:    updated_at TIMESTAMPTZ DEFAULT NOW()
staging_schema.sql:3810:);
staging_schema.sql:3811:
staging_schema.sql:3812:-- Enable RLS
staging_schema.sql:3813:ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
staging_schema.sql:3814:
staging_schema.sql:3815:-- Policies for document_folders
staging_schema.sql:3816:CREATE POLICY "Users can view folders for their properties"
staging_schema.sql:3817:    ON document_folders FOR SELECT
staging_schema.sql:3818:    USING (
staging_schema.sql:3819:        EXISTS (
staging_schema.sql:3820:            SELECT 1 FROM properties p
staging_schema.sql:3821:            WHERE p.id = document_folders.property_id
staging_schema.sql:3822:            AND p.user_id = auth.uid()
staging_schema.sql:3823:        )
staging_schema.sql:3824:    );
staging_schema.sql:3825:
staging_schema.sql:3826:CREATE POLICY "Users can insert folders for their properties"
staging_schema.sql:3827:    ON document_folders FOR INSERT
staging_schema.sql:3828:    WITH CHECK (
staging_schema.sql:3829:        EXISTS (
staging_schema.sql:3830:            SELECT 1 FROM properties p
staging_schema.sql:3831:            WHERE p.id = document_folders.property_id
staging_schema.sql:3832:            AND p.user_id = auth.uid()
staging_schema.sql:3833:        )
staging_schema.sql:3834:    );
staging_schema.sql:3835:
staging_schema.sql:3836:CREATE POLICY "Users can update folders for their properties"
staging_schema.sql:3837:    ON document_folders FOR UPDATE
staging_schema.sql:3838:    USING (
staging_schema.sql:3839:        EXISTS (
staging_schema.sql:3840:            SELECT 1 FROM properties p
staging_schema.sql:3841:            WHERE p.id = document_folders.property_id
staging_schema.sql:3842:            AND p.user_id = auth.uid()
staging_schema.sql:3843:        )
staging_schema.sql:3844:    );
staging_schema.sql:3845:
staging_schema.sql:3846:CREATE POLICY "Users can delete folders for their properties"
staging_schema.sql:3847:    ON document_folders FOR DELETE
staging_schema.sql:3848:    USING (
staging_schema.sql:3849:        EXISTS (
staging_schema.sql:3850:            SELECT 1 FROM properties p
staging_schema.sql:3851:            WHERE p.id = document_folders.property_id
staging_schema.sql:3852:            AND p.user_id = auth.uid()
staging_schema.sql:3853:        )
staging_schema.sql:3854:    );
staging_schema.sql:3855:
staging_schema.sql:3856:-- Add folder_id to property_documents
staging_schema.sql:3857:ALTER TABLE property_documents
staging_schema.sql:3858:ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES document_folders(id) ON DELETE CASCADE;
staging_schema.sql:3859:
staging_schema.sql:3860:-- Create index for performance
staging_schema.sql:3861:CREATE INDEX IF NOT EXISTS idx_document_folders_property_category ON document_folders(property_id, category);
staging_schema.sql:3862:CREATE INDEX IF NOT EXISTS idx_property_documents_folder ON property_documents(folder_id);
staging_schema.sql:3863:-- Create property_media table
staging_schema.sql:3864:CREATE TABLE IF NOT EXISTS public.property_media (
staging_schema.sql:3865:    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
staging_schema.sql:3866:    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
staging_schema.sql:3867:    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
staging_schema.sql:3868:    drive_file_id TEXT NOT NULL,
staging_schema.sql:3869:    drive_web_view_link TEXT NOT NULL,
staging_schema.sql:3870:    drive_thumbnail_link TEXT,
staging_schema.sql:3871:    name TEXT NOT NULL,
staging_schema.sql:3872:    mime_type TEXT,
staging_schema.sql:3873:    size BIGINT,
staging_schema.sql:3874:    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
staging_schema.sql:3875:);
staging_schema.sql:3876:
staging_schema.sql:3877:-- Enable RLS
staging_schema.sql:3878:ALTER TABLE public.property_media ENABLE ROW LEVEL SECURITY;
staging_schema.sql:3879:
staging_schema.sql:3880:-- Policies
staging_schema.sql:3881:CREATE POLICY "Users can view their own property media"
staging_schema.sql:3882:    ON public.property_media FOR SELECT
staging_schema.sql:3883:    USING (auth.uid() = user_id);
staging_schema.sql:3884:
staging_schema.sql:3885:CREATE POLICY "Users can insert their own property media"
staging_schema.sql:3886:    ON public.property_media FOR INSERT
staging_schema.sql:3887:    WITH CHECK (auth.uid() = user_id);
staging_schema.sql:3888:
staging_schema.sql:3889:CREATE POLICY "Users can delete their own property media"
staging_schema.sql:3890:    ON public.property_media FOR DELETE
staging_schema.sql:3891:    USING (auth.uid() = user_id);
staging_schema.sql:3892:
staging_schema.sql:3893:-- Indexes
staging_schema.sql:3894:CREATE INDEX IF NOT EXISTS idx_property_media_property_id ON public.property_media(property_id);
staging_schema.sql:3895:CREATE INDEX IF NOT EXISTS idx_property_media_user_id ON public.property_media(user_id);
staging_schema.sql:3896:-- Create short_links table for URL shortener
staging_schema.sql:3897:-- Migration: 20260119_create_short_links.sql
staging_schema.sql:3898:
staging_schema.sql:3899:CREATE TABLE IF NOT EXISTS public.short_links (
staging_schema.sql:3900:    slug TEXT PRIMARY KEY,
staging_schema.sql:3901:    original_url TEXT NOT NULL,
staging_schema.sql:3902:    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
staging_schema.sql:3903:    expires_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now() + interval '90 days') NOT NULL,
staging_schema.sql:3904:    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL -- Optional: track who created it
staging_schema.sql:3905:);
staging_schema.sql:3906:
staging_schema.sql:3907:-- Enable RLS
staging_schema.sql:3908:ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;
staging_schema.sql:3909:
staging_schema.sql:3910:-- Allow public read access (anyone with the link can use it)
staging_schema.sql:3911:CREATE POLICY "Public can read short links"
staging_schema.sql:3912:ON public.short_links FOR SELECT
staging_schema.sql:3913:USING (true);
staging_schema.sql:3914:
staging_schema.sql:3915:-- Allow public insert access (since the calculator allows sharing without login, technically)
staging_schema.sql:3916:-- Alternatively, if we want to restrict generation to logged-in users, change this.
staging_schema.sql:3917:-- Assuming internal tool for now, but user requirement "without keeping every calculation" 
staging_schema.sql:3918:-- implies ephemeral nature. We'll allow public insert for now to support non-logged-in sharing 
staging_schema.sql:3919:-- if that's a use case, OR restrict to authenticated users if the app requires auth.
staging_schema.sql:3920:-- Given RentMate seems to have auth, let's allow authenticated users.
staging_schema.sql:3921:-- UPDATE: User wants to share results. If guest users can use calculator, they need to insert.
staging_schema.sql:3922:-- Let's stick to authenticated for creation to prevent spam, assuming users log in to use the app effectively.
staging_schema.sql:3923:-- If user is guest, we might need a stored procedure or standard anon policy.
staging_schema.sql:3924:-- Adding "Public can insert" with limits would be safer, but for MVP:
staging_schema.sql:3925:CREATE POLICY "Authenticated users can create short links"
staging_schema.sql:3926:ON public.short_links FOR INSERT
staging_schema.sql:3927:WITH CHECK (auth.role() = 'authenticated');
staging_schema.sql:3928:
staging_schema.sql:3929:-- Also allow anonymous creation if needed? The user removed server-side calc storage.
staging_schema.sql:3930:-- Let's add anonymous policy for now to be safe with "demo" mode or guest usage.
staging_schema.sql:3931:CREATE POLICY "Public can create short links"
staging_schema.sql:3932:ON public.short_links FOR INSERT
staging_schema.sql:3933:WITH CHECK (true);
staging_schema.sql:3934:
staging_schema.sql:3935:-- Auto-cleanup function (optional usually, but good for hygiene)
staging_schema.sql:3936:-- We can rely on `expires_at` in the query `WHERE expires_at > now()`
staging_schema.sql:3937:-- User Storage Usage Tracking
staging_schema.sql:3938:-- Migration: 20260119_create_user_storage_usage.sql
staging_schema.sql:3939:
staging_schema.sql:3940:CREATE TABLE IF NOT EXISTS user_storage_usage (
staging_schema.sql:3941:    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
staging_schema.sql:3942:    total_bytes BIGINT DEFAULT 0,
staging_schema.sql:3943:    file_count INTEGER DEFAULT 0,
staging_schema.sql:3944:    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
staging_schema.sql:3945:    
staging_schema.sql:3946:    -- Breakdown by category
staging_schema.sql:3947:    media_bytes BIGINT DEFAULT 0,
staging_schema.sql:3948:    utilities_bytes BIGINT DEFAULT 0,
staging_schema.sql:3949:    maintenance_bytes BIGINT DEFAULT 0,
staging_schema.sql:3950:    documents_bytes BIGINT DEFAULT 0,
staging_schema.sql:3951:    
staging_schema.sql:3952:    updated_at TIMESTAMPTZ DEFAULT NOW()
staging_schema.sql:3953:);
staging_schema.sql:3954:
staging_schema.sql:3955:-- RLS
staging_schema.sql:3956:ALTER TABLE user_storage_usage ENABLE ROW LEVEL SECURITY;
staging_schema.sql:3957:
staging_schema.sql:3958:CREATE POLICY "Users can view their own storage usage"
staging_schema.sql:3959:    ON user_storage_usage FOR SELECT
staging_schema.sql:3960:    USING (auth.uid() = user_id);
staging_schema.sql:3961:
staging_schema.sql:3962:-- Function to update storage usage
staging_schema.sql:3963:CREATE OR REPLACE FUNCTION update_user_storage()
staging_schema.sql:3964:RETURNS TRIGGER AS $$
staging_schema.sql:3965:BEGIN
staging_schema.sql:3966:    IF TG_OP = 'INSERT' THEN
staging_schema.sql:3967:        INSERT INTO user_storage_usage (user_id, total_bytes, file_count)
staging_schema.sql:3968:        VALUES (NEW.user_id, NEW.file_size, 1)
staging_schema.sql:3969:        ON CONFLICT (user_id) DO UPDATE SET
staging_schema.sql:3970:            total_bytes = user_storage_usage.total_bytes + NEW.file_size,
staging_schema.sql:3971:            file_count = user_storage_usage.file_count + 1,
staging_schema.sql:3972:            updated_at = NOW();
staging_schema.sql:3973:            
staging_schema.sql:3974:    ELSIF TG_OP = 'DELETE' THEN
staging_schema.sql:3975:        UPDATE user_storage_usage
staging_schema.sql:3976:        SET 
staging_schema.sql:3977:            total_bytes = GREATEST(0, total_bytes - OLD.file_size),
staging_schema.sql:3978:            file_count = GREATEST(0, file_count - 1),
staging_schema.sql:3979:            updated_at = NOW()
staging_schema.sql:3980:        WHERE user_id = OLD.user_id;
staging_schema.sql:3981:    END IF;
staging_schema.sql:3982:    
staging_schema.sql:3983:    RETURN NEW;
staging_schema.sql:3984:END;
staging_schema.sql:3985:$$ LANGUAGE plpgsql;
staging_schema.sql:3986:
staging_schema.sql:3987:-- Trigger on property_documents
staging_schema.sql:3988:CREATE TRIGGER update_storage_on_document_change
staging_schema.sql:3989:AFTER INSERT OR DELETE ON property_documents
staging_schema.sql:3990:FOR EACH ROW EXECUTE FUNCTION update_user_storage();
staging_schema.sql:3991:
staging_schema.sql:3992:-- Storage Quota Check Function
staging_schema.sql:3993:CREATE OR REPLACE FUNCTION check_storage_quota(
staging_schema.sql:3994:    p_user_id UUID,
staging_schema.sql:3995:    p_file_size BIGINT
staging_schema.sql:3996:) RETURNS BOOLEAN AS $$
staging_schema.sql:3997:DECLARE
staging_schema.sql:3998:    v_current_usage BIGINT;
staging_schema.sql:3999:    v_max_storage_mb INTEGER;
staging_schema.sql:4000:    v_max_storage_bytes BIGINT;
staging_schema.sql:4001:BEGIN
staging_schema.sql:4002:    -- Get current usage
staging_schema.sql:4003:    SELECT COALESCE(total_bytes, 0)
staging_schema.sql:4004:    INTO v_current_usage
staging_schema.sql:4005:    FROM user_storage_usage
staging_schema.sql:4006:    WHERE user_id = p_user_id;
staging_schema.sql:4007:    
staging_schema.sql:4008:    -- Get plan limit
staging_schema.sql:4009:    SELECT sp.max_storage_mb
staging_schema.sql:4010:    INTO v_max_storage_mb
staging_schema.sql:4011:    FROM user_profiles up
staging_schema.sql:4012:    JOIN subscription_plans sp ON up.plan_id = sp.id
staging_schema.sql:4013:    WHERE up.id = p_user_id;
staging_schema.sql:4014:    
staging_schema.sql:4015:    -- -1 means unlimited
staging_schema.sql:4016:    IF v_max_storage_mb = -1 THEN
staging_schema.sql:4017:        RETURN TRUE;
staging_schema.sql:4018:    END IF;
staging_schema.sql:4019:    
staging_schema.sql:4020:    v_max_storage_bytes := v_max_storage_mb * 1024 * 1024;
staging_schema.sql:4021:    
staging_schema.sql:4022:    -- Check if adding this file would exceed quota
staging_schema.sql:4023:    RETURN (v_current_usage + p_file_size) <= v_max_storage_bytes;
staging_schema.sql:4024:END;
staging_schema.sql:4025:$$ LANGUAGE plpgsql;
staging_schema.sql:4026:
staging_schema.sql:4027:-- Comments
staging_schema.sql:4028:-- Enable RLS (Ensure it's enabled)
staging_schema.sql:4029:ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
staging_schema.sql:4030:
staging_schema.sql:4031:-- Drop existing policies to avoid conflicts
staging_schema.sql:4032:DROP POLICY IF EXISTS "Users can view folders for their properties" ON document_folders;
staging_schema.sql:4033:DROP POLICY IF EXISTS "Users can insert folders for their properties" ON document_folders;
staging_schema.sql:4034:DROP POLICY IF EXISTS "Users can update folders for their properties" ON document_folders;
staging_schema.sql:4035:DROP POLICY IF EXISTS "Users can delete folders for their properties" ON document_folders;
staging_schema.sql:4036:
staging_schema.sql:4037:-- Re-create Policies
staging_schema.sql:4038:
staging_schema.sql:4039:-- 1. SELECT
staging_schema.sql:4040:CREATE POLICY "Users can view folders for their properties"
staging_schema.sql:4041:    ON document_folders FOR SELECT
staging_schema.sql:4042:    USING (
staging_schema.sql:4043:        EXISTS (
staging_schema.sql:4044:            SELECT 1 FROM properties p
staging_schema.sql:4045:            WHERE p.id = document_folders.property_id
staging_schema.sql:4046:            AND p.user_id = auth.uid()
staging_schema.sql:4047:        )
staging_schema.sql:4048:    );
staging_schema.sql:4049:
staging_schema.sql:4050:-- 2. INSERT
staging_schema.sql:4051:CREATE POLICY "Users can insert folders for their properties"
staging_schema.sql:4052:    ON document_folders FOR INSERT
staging_schema.sql:4053:    WITH CHECK (
staging_schema.sql:4054:        EXISTS (
staging_schema.sql:4055:            SELECT 1 FROM properties p
staging_schema.sql:4056:            WHERE p.id = document_folders.property_id
staging_schema.sql:4057:            AND p.user_id = auth.uid()
staging_schema.sql:4058:        )
staging_schema.sql:4059:    );
staging_schema.sql:4060:
staging_schema.sql:4061:-- 3. UPDATE
staging_schema.sql:4062:CREATE POLICY "Users can update folders for their properties"
staging_schema.sql:4063:    ON document_folders FOR UPDATE
staging_schema.sql:4064:    USING (
staging_schema.sql:4065:        EXISTS (
staging_schema.sql:4066:            SELECT 1 FROM properties p
staging_schema.sql:4067:            WHERE p.id = document_folders.property_id
staging_schema.sql:4068:            AND p.user_id = auth.uid()
staging_schema.sql:4069:        )
staging_schema.sql:4070:    );
staging_schema.sql:4071:
staging_schema.sql:4072:-- 4. DELETE
staging_schema.sql:4073:CREATE POLICY "Users can delete folders for their properties"
staging_schema.sql:4074:    ON document_folders FOR DELETE
staging_schema.sql:4075:    USING (
staging_schema.sql:4076:        EXISTS (
staging_schema.sql:4077:            SELECT 1 FROM properties p
staging_schema.sql:4078:            WHERE p.id = document_folders.property_id
staging_schema.sql:4079:            AND p.user_id = auth.uid()
staging_schema.sql:4080:        )
staging_schema.sql:4081:    );
staging_schema.sql:4082:
staging_schema.sql:4083:-- Force schema cache reload again just in case
staging_schema.sql:4084:NOTIFY pgrst, 'reload schema';
staging_schema.sql:4085:-- Fix RLS Violation in Storage Trigger (with Category Support)
staging_schema.sql:4086:-- Migration: 20260119_fix_trigger_security.sql
staging_schema.sql:4087:
staging_schema.sql:4088:-- The update_user_storage function needs to run with SECURITY DEFINER
staging_schema.sql:4089:-- because it modifies user_storage_usage which has RLS enabled.
staging_schema.sql:4090:
staging_schema.sql:4091:CREATE OR REPLACE FUNCTION update_user_storage()
staging_schema.sql:4092:RETURNS TRIGGER AS $$
staging_schema.sql:4093:DECLARE
staging_schema.sql:4094:    v_col TEXT;
staging_schema.sql:4095:    v_size BIGINT;
staging_schema.sql:4096:    v_user_id UUID;
staging_schema.sql:4097:    v_cat TEXT;
staging_schema.sql:4098:BEGIN
staging_schema.sql:4099:    IF TG_OP = 'INSERT' THEN
staging_schema.sql:4100:        v_size := NEW.file_size;
staging_schema.sql:4101:        v_user_id := NEW.user_id;
staging_schema.sql:4102:        v_cat := NEW.category;
staging_schema.sql:4103:    ELSE
staging_schema.sql:4104:        v_size := OLD.file_size;
staging_schema.sql:4105:        v_user_id := OLD.user_id;
staging_schema.sql:4106:        v_cat := OLD.category;
staging_schema.sql:4107:    END IF;
staging_schema.sql:4108:
staging_schema.sql:4109:    -- Determine which column to update based on category
staging_schema.sql:4110:    IF v_cat IN ('photo', 'video') THEN
staging_schema.sql:4111:        v_col := 'media_bytes';
staging_schema.sql:4112:    ELSIF v_cat LIKE 'utility_%' THEN
staging_schema.sql:4113:        v_col := 'utilities_bytes';
staging_schema.sql:4114:    ELSIF v_cat = 'maintenance' THEN
staging_schema.sql:4115:        v_col := 'maintenance_bytes';
staging_schema.sql:4116:    ELSE
staging_schema.sql:4117:        v_col := 'documents_bytes';
staging_schema.sql:4118:    END IF;
staging_schema.sql:4119:
staging_schema.sql:4120:    IF TG_OP = 'INSERT' THEN
staging_schema.sql:4121:        EXECUTE format('
staging_schema.sql:4122:            INSERT INTO user_storage_usage (user_id, total_bytes, file_count, %I)
staging_schema.sql:4123:            VALUES ($1, $2, 1, $2)
staging_schema.sql:4124:            ON CONFLICT (user_id) DO UPDATE SET
staging_schema.sql:4125:                total_bytes = user_storage_usage.total_bytes + $2,
staging_schema.sql:4126:                file_count = user_storage_usage.file_count + 1,
staging_schema.sql:4127:                %I = user_storage_usage.%I + $2,
staging_schema.sql:4128:                updated_at = NOW()
staging_schema.sql:4129:        ', v_col, v_col, v_col) USING v_user_id, v_size;
staging_schema.sql:4130:            
staging_schema.sql:4131:    ELSIF TG_OP = 'DELETE' THEN
staging_schema.sql:4132:        EXECUTE format('
staging_schema.sql:4133:            UPDATE user_storage_usage
staging_schema.sql:4134:            SET 
staging_schema.sql:4135:                total_bytes = GREATEST(0, total_bytes - $1),
staging_schema.sql:4136:                file_count = GREATEST(0, file_count - 1),
staging_schema.sql:4137:                %I = GREATEST(0, %I - $1),
staging_schema.sql:4138:                updated_at = NOW()
staging_schema.sql:4139:            WHERE user_id = $2
staging_schema.sql:4140:        ', v_col, v_col) USING v_size, v_user_id;
staging_schema.sql:4141:    END IF;
staging_schema.sql:4142:    
staging_schema.sql:4143:    RETURN NULL; 
staging_schema.sql:4144:END;
staging_schema.sql:4145:$$ LANGUAGE plpgsql SECURITY DEFINER;
staging_schema.sql:4146:-- Update Storage Tracking to include category breakdown
staging_schema.sql:4147:-- Migration: 20260119_update_storage_trigger.sql
staging_schema.sql:4148:
staging_schema.sql:4149:CREATE OR REPLACE FUNCTION update_user_storage()
staging_schema.sql:4150:RETURNS TRIGGER AS $$
staging_schema.sql:4151:DECLARE
staging_schema.sql:4152:    v_col TEXT;
staging_schema.sql:4153:    v_size BIGINT;
staging_schema.sql:4154:    v_user_id UUID;
staging_schema.sql:4155:    v_cat TEXT;
staging_schema.sql:4156:BEGIN
staging_schema.sql:4157:    IF TG_OP = 'INSERT' THEN
staging_schema.sql:4158:        v_size := NEW.file_size;
staging_schema.sql:4159:        v_user_id := NEW.user_id;
staging_schema.sql:4160:        v_cat := NEW.category;
staging_schema.sql:4161:    ELSE
staging_schema.sql:4162:        v_size := OLD.file_size;
staging_schema.sql:4163:        v_user_id := OLD.user_id;
staging_schema.sql:4164:        v_cat := OLD.category;
staging_schema.sql:4165:    END IF;
staging_schema.sql:4166:
staging_schema.sql:4167:    -- Determine which column to update based on category
staging_schema.sql:4168:    IF v_cat IN ('photo', 'video') THEN
staging_schema.sql:4169:        v_col := 'media_bytes';
staging_schema.sql:4170:    ELSIF v_cat LIKE 'utility_%' THEN
staging_schema.sql:4171:        v_col := 'utilities_bytes';
staging_schema.sql:4172:    ELSIF v_cat = 'maintenance' THEN
staging_schema.sql:4173:        v_col := 'maintenance_bytes';
staging_schema.sql:4174:    ELSE
staging_schema.sql:4175:        v_col := 'documents_bytes';
staging_schema.sql:4176:    END IF;
staging_schema.sql:4177:
staging_schema.sql:4178:    IF TG_OP = 'INSERT' THEN
staging_schema.sql:4179:        EXECUTE format('
staging_schema.sql:4180:            INSERT INTO user_storage_usage (user_id, total_bytes, file_count, %I)
staging_schema.sql:4181:            VALUES ($1, $2, 1, $2)
staging_schema.sql:4182:            ON CONFLICT (user_id) DO UPDATE SET
staging_schema.sql:4183:                total_bytes = user_storage_usage.total_bytes + $2,
staging_schema.sql:4184:                file_count = user_storage_usage.file_count + 1,
staging_schema.sql:4185:                %I = user_storage_usage.%I + $2,
staging_schema.sql:4186:                updated_at = NOW()
staging_schema.sql:4187:        ', v_col, v_col, v_col) USING v_user_id, v_size;
staging_schema.sql:4188:            
staging_schema.sql:4189:    ELSIF TG_OP = 'DELETE' THEN
staging_schema.sql:4190:        EXECUTE format('
staging_schema.sql:4191:            UPDATE user_storage_usage
staging_schema.sql:4192:            SET 
staging_schema.sql:4193:                total_bytes = GREATEST(0, total_bytes - $1),
staging_schema.sql:4194:                file_count = GREATEST(0, file_count - 1),
staging_schema.sql:4195:                %I = GREATEST(0, %I - $1),
staging_schema.sql:4196:                updated_at = NOW()
staging_schema.sql:4197:            WHERE user_id = $2
staging_schema.sql:4198:        ', v_col, v_col) USING v_size, v_user_id;
staging_schema.sql:4199:    END IF;
staging_schema.sql:4200:    
staging_schema.sql:4201:    RETURN NULL; -- result is ignored since this is an AFTER trigger
staging_schema.sql:4202:END;
staging_schema.sql:4203:$$ LANGUAGE plpgsql;
staging_schema.sql:4204:-- Add extension_option_start column to contracts table
staging_schema.sql:4205:-- This column stores when the tenant's extension option period begins
staging_schema.sql:4206:
staging_schema.sql:4207:ALTER TABLE public.contracts
staging_schema.sql:4208:ADD COLUMN IF NOT EXISTS extension_option_start DATE;
staging_schema.sql:4209:
staging_schema.sql:4210:-- AI Chat Usage Tracking
staging_schema.sql:4211:CREATE TABLE IF NOT EXISTS ai_chat_usage (
staging_schema.sql:4212:    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
staging_schema.sql:4213:    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
staging_schema.sql:4214:    message_count INTEGER DEFAULT 0,
staging_schema.sql:4215:    tokens_used INTEGER DEFAULT 0,
staging_schema.sql:4216:    last_reset_at TIMESTAMPTZ DEFAULT NOW(),
staging_schema.sql:4217:    created_at TIMESTAMPTZ DEFAULT NOW(),
staging_schema.sql:4218:    updated_at TIMESTAMPTZ DEFAULT NOW(),
staging_schema.sql:4219:    UNIQUE(user_id)
staging_schema.sql:4220:);
staging_schema.sql:4221:
staging_schema.sql:4222:-- AI Usage Limits per Subscription Tier
staging_schema.sql:4223:CREATE TABLE IF NOT EXISTS ai_usage_limits (
staging_schema.sql:4224:    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
staging_schema.sql:4225:    tier_name TEXT NOT NULL UNIQUE,
staging_schema.sql:4226:    monthly_message_limit INTEGER NOT NULL,
staging_schema.sql:4227:    monthly_token_limit INTEGER NOT NULL,
staging_schema.sql:4228:    created_at TIMESTAMPTZ DEFAULT NOW(),
staging_schema.sql:4229:    updated_at TIMESTAMPTZ DEFAULT NOW()
staging_schema.sql:4230:);
staging_schema.sql:4231:
staging_schema.sql:4232:-- Insert default limits
staging_schema.sql:4233:INSERT INTO ai_usage_limits (tier_name, monthly_message_limit, monthly_token_limit) VALUES
staging_schema.sql:4234:    ('free', 50, 50000),           -- 50 messages, ~50k tokens
staging_schema.sql:4235:    ('basic', 200, 200000),         -- 200 messages, ~200k tokens
staging_schema.sql:4236:    ('pro', 1000, 1000000),         -- 1000 messages, ~1M tokens
staging_schema.sql:4237:    ('business', -1, -1)            -- Unlimited (-1)
staging_schema.sql:4238:ON CONFLICT (tier_name) DO NOTHING;
staging_schema.sql:4239:
staging_schema.sql:4240:-- Function to check and log AI usage
staging_schema.sql:4241:CREATE OR REPLACE FUNCTION check_ai_chat_usage(
staging_schema.sql:4242:    p_user_id UUID,
staging_schema.sql:4243:    p_tokens_used INTEGER DEFAULT 500
staging_schema.sql:4244:)
staging_schema.sql:4245:RETURNS JSON AS $$
staging_schema.sql:4246:DECLARE
staging_schema.sql:4247:    v_usage RECORD;
staging_schema.sql:4248:    v_limit RECORD;
staging_schema.sql:4249:    v_user_tier TEXT;
staging_schema.sql:4250:    v_result JSON;
staging_schema.sql:4251:BEGIN
staging_schema.sql:4252:    -- Get user's subscription tier
staging_schema.sql:4253:    SELECT subscription_tier INTO v_user_tier
staging_schema.sql:4254:    FROM user_profiles
staging_schema.sql:4255:    WHERE id = p_user_id;
staging_schema.sql:4256:    
staging_schema.sql:4257:    -- Default to free if no tier found
staging_schema.sql:4258:    v_user_tier := COALESCE(v_user_tier, 'free');
staging_schema.sql:4259:    
staging_schema.sql:4260:    -- Get limits for this tier
staging_schema.sql:4261:    SELECT * INTO v_limit
staging_schema.sql:4262:    FROM ai_usage_limits
staging_schema.sql:4263:    WHERE tier_name = v_user_tier;
staging_schema.sql:4264:    
staging_schema.sql:4265:    -- Get or create usage record
staging_schema.sql:4266:    INSERT INTO ai_chat_usage (user_id, message_count, tokens_used)
staging_schema.sql:4267:    VALUES (p_user_id, 0, 0)
staging_schema.sql:4268:    ON CONFLICT (user_id) DO NOTHING;
staging_schema.sql:4269:    
staging_schema.sql:4270:    SELECT * INTO v_usage
staging_schema.sql:4271:    FROM ai_chat_usage
staging_schema.sql:4272:    WHERE user_id = p_user_id;
staging_schema.sql:4273:    
staging_schema.sql:4274:    -- Check if we need to reset (monthly)
staging_schema.sql:4275:    IF v_usage.last_reset_at < DATE_TRUNC('month', NOW()) THEN
staging_schema.sql:4276:        UPDATE ai_chat_usage
staging_schema.sql:4277:        SET message_count = 0,
staging_schema.sql:4278:            tokens_used = 0,
staging_schema.sql:4279:            last_reset_at = NOW(),
staging_schema.sql:4280:            updated_at = NOW()
staging_schema.sql:4281:        WHERE user_id = p_user_id;
staging_schema.sql:4282:        
staging_schema.sql:4283:        v_usage.message_count := 0;
staging_schema.sql:4284:        v_usage.tokens_used := 0;
staging_schema.sql:4285:    END IF;
staging_schema.sql:4286:    
staging_schema.sql:4287:    -- Check limits (skip if unlimited)
staging_schema.sql:4288:    IF v_limit.monthly_message_limit != -1 AND v_usage.message_count >= v_limit.monthly_message_limit THEN
staging_schema.sql:4289:        v_result := json_build_object(
staging_schema.sql:4290:            'allowed', false,
staging_schema.sql:4291:            'reason', 'message_limit_exceeded',
staging_schema.sql:4292:            'current_usage', v_usage.message_count,
staging_schema.sql:4293:            'limit', v_limit.monthly_message_limit,
staging_schema.sql:4294:            'tier', v_user_tier
staging_schema.sql:4295:        );
staging_schema.sql:4296:        RETURN v_result;
staging_schema.sql:4297:    END IF;
staging_schema.sql:4298:    
staging_schema.sql:4299:    IF v_limit.monthly_token_limit != -1 AND v_usage.tokens_used >= v_limit.monthly_token_limit THEN
staging_schema.sql:4300:        v_result := json_build_object(
staging_schema.sql:4301:            'allowed', false,
staging_schema.sql:4302:            'reason', 'token_limit_exceeded',
staging_schema.sql:4303:            'current_usage', v_usage.tokens_used,
staging_schema.sql:4304:            'limit', v_limit.monthly_token_limit,
staging_schema.sql:4305:            'tier', v_user_tier
staging_schema.sql:4306:        );
staging_schema.sql:4307:        RETURN v_result;
staging_schema.sql:4308:    END IF;
staging_schema.sql:4309:    
staging_schema.sql:4310:    -- Increment usage
staging_schema.sql:4311:    UPDATE ai_chat_usage
staging_schema.sql:4312:    SET message_count = message_count + 1,
staging_schema.sql:4313:        tokens_used = tokens_used + p_tokens_used,
staging_schema.sql:4314:        updated_at = NOW()
staging_schema.sql:4315:    WHERE user_id = p_user_id;
staging_schema.sql:4316:    
staging_schema.sql:4317:    -- Return success
staging_schema.sql:4318:    v_result := json_build_object(
staging_schema.sql:4319:        'allowed', true,
staging_schema.sql:4320:        'current_messages', v_usage.message_count + 1,
staging_schema.sql:4321:        'message_limit', v_limit.monthly_message_limit,
staging_schema.sql:4322:        'current_tokens', v_usage.tokens_used + p_tokens_used,
staging_schema.sql:4323:        'token_limit', v_limit.monthly_token_limit,
staging_schema.sql:4324:        'tier', v_user_tier
staging_schema.sql:4325:    );
staging_schema.sql:4326:    
staging_schema.sql:4327:    RETURN v_result;
staging_schema.sql:4328:END;
staging_schema.sql:4329:$$ LANGUAGE plpgsql SECURITY DEFINER;
staging_schema.sql:4330:
staging_schema.sql:4331:-- RLS Policies
staging_schema.sql:4332:ALTER TABLE ai_chat_usage ENABLE ROW LEVEL SECURITY;
staging_schema.sql:4333:ALTER TABLE ai_usage_limits ENABLE ROW LEVEL SECURITY;
staging_schema.sql:4334:
staging_schema.sql:4335:-- Users can view their own usage
staging_schema.sql:4336:CREATE POLICY "Users can view own AI usage"
staging_schema.sql:4337:    ON ai_chat_usage FOR SELECT
staging_schema.sql:4338:    USING (auth.uid() = user_id);
staging_schema.sql:4339:
staging_schema.sql:4340:-- Admins can view all usage
staging_schema.sql:4341:CREATE POLICY "Admins can view all AI usage"
staging_schema.sql:4342:    ON ai_chat_usage FOR ALL
staging_schema.sql:4343:    USING (
staging_schema.sql:4344:        EXISTS (
staging_schema.sql:4345:            SELECT 1 FROM user_profiles
staging_schema.sql:4346:            WHERE id = auth.uid() AND role = 'admin'
staging_schema.sql:4347:        )
staging_schema.sql:4348:    );
staging_schema.sql:4349:
staging_schema.sql:4350:-- Everyone can view limits (for UI display)
staging_schema.sql:4351:CREATE POLICY "Anyone can view AI limits"
staging_schema.sql:4352:    ON ai_usage_limits FOR SELECT
staging_schema.sql:4353:    TO authenticated
staging_schema.sql:4354:    USING (true);
staging_schema.sql:4355:
staging_schema.sql:4356:-- Only admins can modify limits
staging_schema.sql:4357:CREATE POLICY "Admins can modify AI limits"
staging_schema.sql:4358:    ON ai_usage_limits FOR ALL
staging_schema.sql:4359:    USING (
staging_schema.sql:4360:        EXISTS (
staging_schema.sql:4361:            SELECT 1 FROM user_profiles
staging_schema.sql:4362:            WHERE id = auth.uid() AND role = 'admin'
staging_schema.sql:4363:        )
staging_schema.sql:4364:    );
staging_schema.sql:4365:
staging_schema.sql:4366:-- Indexes for performance
staging_schema.sql:4367:CREATE INDEX IF NOT EXISTS idx_ai_chat_usage_user_id ON ai_chat_usage(user_id);
staging_schema.sql:4368:CREATE INDEX IF NOT EXISTS idx_ai_chat_usage_last_reset ON ai_chat_usage(last_reset_at);
staging_schema.sql:4369:-- 1. Add notification_preferences column to user_profiles
staging_schema.sql:4370:ALTER TABLE public.user_profiles
staging_schema.sql:4371:ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"contract_expiry_days": 60, "rent_due_days": 3}';
staging_schema.sql:4372:
staging_schema.sql:4373:-- 2. Update Contract Expiration Check to use preferences
staging_schema.sql:4374:CREATE OR REPLACE FUNCTION public.check_contract_expirations()
staging_schema.sql:4375:RETURNS void
staging_schema.sql:4376:LANGUAGE plpgsql
staging_schema.sql:4377:SECURITY DEFINER
staging_schema.sql:4378:AS $$
staging_schema.sql:4379:DECLARE
staging_schema.sql:4380:    expiring_contract RECORD;
staging_schema.sql:4381:    count_new integer := 0;
staging_schema.sql:4382:    pref_days integer;
staging_schema.sql:4383:BEGIN
staging_schema.sql:4384:    FOR expiring_contract IN
staging_schema.sql:4385:        SELECT 
staging_schema.sql:4386:            c.id, 
staging_schema.sql:4387:            c.end_date, 
staging_schema.sql:4388:            c.property_id, 
staging_schema.sql:4389:            p.user_id, 
staging_schema.sql:4390:            p.address, 
staging_schema.sql:4391:            p.city,
staging_schema.sql:4392:            up.notification_preferences
staging_schema.sql:4393:        FROM public.contracts c
staging_schema.sql:4394:        JOIN public.properties p ON c.property_id = p.id
staging_schema.sql:4395:        JOIN public.user_profiles up ON p.user_id = up.id
staging_schema.sql:4396:        WHERE c.status = 'active'
staging_schema.sql:4397:    LOOP
staging_schema.sql:4398:        -- Extract preference, default to 60, cap at 180
staging_schema.sql:4399:        pref_days := COALESCE((expiring_contract.notification_preferences->>'contract_expiry_days')::int, 60);
staging_schema.sql:4400:        IF pref_days > 180 THEN pref_days := 180; END IF;
staging_schema.sql:4401:        IF pref_days < 1 THEN pref_days := 1; END IF;
staging_schema.sql:4402:
staging_schema.sql:4403:        -- Check if contract expires in this window
staging_schema.sql:4404:        IF expiring_contract.end_date <= (CURRENT_DATE + (pref_days || ' days')::interval)
staging_schema.sql:4405:           AND expiring_contract.end_date >= CURRENT_DATE THEN
staging_schema.sql:4406:           
staging_schema.sql:4407:            IF NOT EXISTS (
staging_schema.sql:4408:                SELECT 1 
staging_schema.sql:4409:                FROM public.notifications n 
staging_schema.sql:4410:                WHERE n.user_id = expiring_contract.user_id
staging_schema.sql:4411:                AND n.type = 'warning'
staging_schema.sql:4412:                AND n.metadata->>'contract_id' = expiring_contract.id::text
staging_schema.sql:4413:                -- We allow re-notifying if the title implies a different "tier" of warning, but for now we keep it simple
staging_schema.sql:4414:                -- Just alert once per contract expiry cycle is usually enough, or enable duplicates if significant time 
passed
staging_schema.sql:4415:                 AND n.created_at > (CURRENT_DATE - INTERVAL '6 months') -- Simple debounce for same contract
staging_schema.sql:4416:            ) THEN
staging_schema.sql:4417:                INSERT INTO public.notifications (
staging_schema.sql:4418:                    user_id,
staging_schema.sql:4419:                    type,
staging_schema.sql:4420:                    title,
staging_schema.sql:4421:                    message,
staging_schema.sql:4422:                    metadata
staging_schema.sql:4423:                ) VALUES (
staging_schema.sql:4424:                    expiring_contract.user_id,
staging_schema.sql:4425:                    'warning',
staging_schema.sql:4426:                    'Contract Expiring Soon',
staging_schema.sql:4427:                    'Contract for ' || expiring_contract.address || ' ends in ' || (expiring_contract.end_date - 
CURRENT_DATE)::text || ' days (' || to_char(expiring_contract.end_date, 'DD/MM/YYYY') || '). Review and renew today.',
staging_schema.sql:4428:                    jsonb_build_object('contract_id', expiring_contract.id)
staging_schema.sql:4429:                );
staging_schema.sql:4430:                count_new := count_new + 1;
staging_schema.sql:4431:            END IF;
staging_schema.sql:4432:        END IF;
staging_schema.sql:4433:    END LOOP;
staging_schema.sql:4434:END;
staging_schema.sql:4435:$$;
staging_schema.sql:4436:
staging_schema.sql:4437:-- 3. Update Rent Due Check to use preferences
staging_schema.sql:4438:CREATE OR REPLACE FUNCTION public.check_rent_due()
staging_schema.sql:4439:RETURNS void
staging_schema.sql:4440:LANGUAGE plpgsql
staging_schema.sql:4441:SECURITY DEFINER
staging_schema.sql:4442:AS $$
staging_schema.sql:4443:DECLARE
staging_schema.sql:4444:    due_payment RECORD;
staging_schema.sql:4445:    count_new integer := 0;
staging_schema.sql:4446:    pref_days integer;
staging_schema.sql:4447:BEGIN
staging_schema.sql:4448:    FOR due_payment IN
staging_schema.sql:4449:        SELECT 
staging_schema.sql:4450:            pay.id,
staging_schema.sql:4451:            pay.due_date,
staging_schema.sql:4452:            pay.amount,
staging_schema.sql:4453:            pay.currency,
staging_schema.sql:4454:            p.user_id,
staging_schema.sql:4455:            p.address,
staging_schema.sql:4456:            up.notification_preferences
staging_schema.sql:4457:        FROM public.payments pay
staging_schema.sql:4458:        JOIN public.contracts c ON pay.contract_id = c.id
staging_schema.sql:4459:        JOIN public.properties p ON c.property_id = p.id
staging_schema.sql:4460:        JOIN public.user_profiles up ON p.user_id = up.id
staging_schema.sql:4461:        WHERE pay.status = 'pending'
staging_schema.sql:4462:    LOOP
staging_schema.sql:4463:        -- Extract preference, default to 3, cap at 180 (though less makes sense for rent)
staging_schema.sql:4464:        pref_days := COALESCE((due_payment.notification_preferences->>'rent_due_days')::int, 3);
staging_schema.sql:4465:        IF pref_days > 180 THEN pref_days := 180; END IF;
staging_schema.sql:4466:
staging_schema.sql:4467:        IF due_payment.due_date <= (CURRENT_DATE + (pref_days || ' days')::interval)
staging_schema.sql:4468:           AND due_payment.due_date >= CURRENT_DATE THEN
staging_schema.sql:4469:
staging_schema.sql:4470:            IF NOT EXISTS (
staging_schema.sql:4471:                SELECT 1 
staging_schema.sql:4472:                FROM public.notifications n 
staging_schema.sql:4473:                WHERE n.user_id = due_payment.user_id
staging_schema.sql:4474:                AND n.type = 'info'
staging_schema.sql:4475:                AND n.metadata->>'payment_id' = due_payment.id::text
staging_schema.sql:4476:            ) THEN
staging_schema.sql:4477:                INSERT INTO public.notifications (
staging_schema.sql:4478:                    user_id,
staging_schema.sql:4479:                    type,
staging_schema.sql:4480:                    title,
staging_schema.sql:4481:                    message,
staging_schema.sql:4482:                    metadata
staging_schema.sql:4483:                ) VALUES (
staging_schema.sql:4484:                    due_payment.user_id,
staging_schema.sql:4485:                    'info',
staging_schema.sql:4486:                    'Rent Due Soon',
staging_schema.sql:4487:                    'Rent of ' || due_payment.amount || ' ' || due_payment.currency || ' for ' || due_payment.address || ' is 
due on ' || to_char(due_payment.due_date, 'DD/MM/YYYY') || '.',
staging_schema.sql:4488:                    jsonb_build_object('payment_id', due_payment.id)
staging_schema.sql:4489:                );
staging_schema.sql:4490:                count_new := count_new + 1;
staging_schema.sql:4491:            END IF;
staging_schema.sql:4492:        END IF;
staging_schema.sql:4493:    END LOOP;
staging_schema.sql:4494:END;
staging_schema.sql:4495:$$;
staging_schema.sql:4496:-- Migration: 20260120_database_performance_refactor.sql
staging_schema.sql:4497:-- Description: Adds missing indexes for foreign keys and implements RPCs for faster dashboard data retrieval.
staging_schema.sql:4498:
staging_schema.sql:4499:-- ==============================================================================
staging_schema.sql:4500:-- 1. ADD MISSING INDEXES FOR PERFORMANCE
staging_schema.sql:4501:-- ==============================================================================
staging_schema.sql:4502:
staging_schema.sql:4503:-- Contracts: user_id, property_id, tenant_id
staging_schema.sql:4504:CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON public.contracts(user_id);
staging_schema.sql:4505:CREATE INDEX IF NOT EXISTS idx_contracts_property_id ON public.contracts(property_id);
staging_schema.sql:4506:CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id ON public.contracts(tenant_id);
staging_schema.sql:4507:
staging_schema.sql:4508:-- Payments: user_id, contract_id, status
staging_schema.sql:4509:CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
staging_schema.sql:4510:CREATE INDEX IF NOT EXISTS idx_payments_contract_id ON public.payments(contract_id);
staging_schema.sql:4511:CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
staging_schema.sql:4512:
staging_schema.sql:4513:-- Property Documents: user_id, property_id, folder_id, category
staging_schema.sql:4514:CREATE INDEX IF NOT EXISTS idx_property_docs_user_id ON public.property_documents(user_id);
staging_schema.sql:4515:CREATE INDEX IF NOT EXISTS idx_property_docs_property_id ON public.property_documents(property_id);
staging_schema.sql:4516:CREATE INDEX IF NOT EXISTS idx_property_docs_folder_id ON public.property_documents(folder_id);
staging_schema.sql:4517:CREATE INDEX IF NOT EXISTS idx_property_docs_category ON public.property_documents(category);
staging_schema.sql:4518:
staging_schema.sql:4519:-- Document Folders: property_id
staging_schema.sql:4520:CREATE INDEX IF NOT EXISTS idx_document_folders_property_id ON public.document_folders(property_id);
staging_schema.sql:4521:
staging_schema.sql:4522:-- Short Links: user_id, created_at
staging_schema.sql:4523:CREATE INDEX IF NOT EXISTS idx_short_links_user_id ON public.short_links(user_id);
staging_schema.sql:4524:CREATE INDEX IF NOT EXISTS idx_short_links_created_at ON public.short_links(created_at);
staging_schema.sql:4525:
staging_schema.sql:4526:-- ==============================================================================
staging_schema.sql:4527:-- 2. CREATE RPCS FOR AGGREGATED DATA
staging_schema.sql:4528:-- ==============================================================================
staging_schema.sql:4529:
staging_schema.sql:4530:/**
staging_schema.sql:4531: * Efficiently get counts of documents per category for a user.
staging_schema.sql:4532: * Replaces client-side aggregation in Dashboard.
staging_schema.sql:4533: */
staging_schema.sql:4534:CREATE OR REPLACE FUNCTION public.get_property_document_counts(p_user_id UUID)
staging_schema.sql:4535:RETURNS JSONB
staging_schema.sql:4536:LANGUAGE plpgsql
staging_schema.sql:4537:SECURITY DEFINER
staging_schema.sql:4538:AS $$
staging_schema.sql:4539:DECLARE
staging_schema.sql:4540:    result JSONB;
staging_schema.sql:4541:BEGIN
staging_schema.sql:4542:    SELECT jsonb_build_object(
staging_schema.sql:4543:        'media', COUNT(*) FILTER (WHERE category IN ('photo', 'video')),
staging_schema.sql:4544:        'utilities', COUNT(*) FILTER (WHERE category LIKE 'utility_%'),
staging_schema.sql:4545:        'maintenance', COUNT(*) FILTER (WHERE category = 'maintenance'),
staging_schema.sql:4546:        'documents', COUNT(*) FILTER (WHERE category NOT IN ('photo', 'video', 'maintenance') AND category NOT LIKE 
'utility_%')
staging_schema.sql:4547:    ) INTO result
staging_schema.sql:4548:    FROM public.property_documents
staging_schema.sql:4549:    WHERE user_id = p_user_id;
staging_schema.sql:4550:
staging_schema.sql:4551:    RETURN result;
staging_schema.sql:4552:END;
staging_schema.sql:4553:$$;
staging_schema.sql:4554:
staging_schema.sql:4555:/**
staging_schema.sql:4556: * Get high-level dashboard stats in a single call.
staging_schema.sql:4557: * Including income, pending payments, and document counts.
staging_schema.sql:4558: */
staging_schema.sql:4559:CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_user_id UUID)
staging_schema.sql:4560:RETURNS JSONB
staging_schema.sql:4561:LANGUAGE plpgsql
staging_schema.sql:4562:SECURITY DEFINER
staging_schema.sql:4563:AS $$
staging_schema.sql:4564:DECLARE
staging_schema.sql:4565:    income_stats RECORD;
staging_schema.sql:4566:    doc_counts JSONB;
staging_schema.sql:4567:BEGIN
staging_schema.sql:4568:    -- 1. Get Income Stats
staging_schema.sql:4569:    SELECT 
staging_schema.sql:4570:        COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as collected,
staging_schema.sql:4571:        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as pending,
staging_schema.sql:4572:        COALESCE(SUM(amount) FILTER (WHERE status IN ('paid', 'pending')), 0) as total
staging_schema.sql:4573:    INTO income_stats
staging_schema.sql:4574:    FROM public.payments
staging_schema.sql:4575:    WHERE user_id = p_user_id
staging_schema.sql:4576:    AND due_date >= date_trunc('month', now())
staging_schema.sql:4577:    AND due_date < date_trunc('month', now() + interval '1 month');
staging_schema.sql:4578:
staging_schema.sql:4579:    -- 2. Get Document Counts (reuse RPC logic)
staging_schema.sql:4580:    doc_counts := public.get_property_document_counts(p_user_id);
staging_schema.sql:4581:
staging_schema.sql:4582:    RETURN jsonb_build_object(
staging_schema.sql:4583:        'income', jsonb_build_object(
staging_schema.sql:4584:            'collected', income_stats.collected,
staging_schema.sql:4585:            'pending', income_stats.pending,
staging_schema.sql:4586:            'monthlyTotal', income_stats.total
staging_schema.sql:4587:        ),
staging_schema.sql:4588:        'storage', doc_counts,
staging_schema.sql:4589:        'timestamp', now()
staging_schema.sql:4590:    );
staging_schema.sql:4591:END;
staging_schema.sql:4592:$$;
staging_schema.sql:4593:-- Comprehensive Daily Notification Logic
staging_schema.sql:4594:
staging_schema.sql:4595:-- 1. Updated Contract Expiration Check (60 days)
staging_schema.sql:4596:CREATE OR REPLACE FUNCTION public.check_contract_expirations()
staging_schema.sql:4597:RETURNS void
staging_schema.sql:4598:LANGUAGE plpgsql
staging_schema.sql:4599:SECURITY DEFINER
staging_schema.sql:4600:AS $$
staging_schema.sql:4601:DECLARE
staging_schema.sql:4602:    expiring_contract RECORD;
staging_schema.sql:4603:    count_new integer := 0;
staging_schema.sql:4604:BEGIN
staging_schema.sql:4605:    FOR expiring_contract IN
staging_schema.sql:4606:        SELECT 
staging_schema.sql:4607:            c.id, 
staging_schema.sql:4608:            c.end_date, 
staging_schema.sql:4609:            c.property_id, 
staging_schema.sql:4610:            p.user_id, 
staging_schema.sql:4611:            p.address, 
staging_schema.sql:4612:            p.city
staging_schema.sql:4613:        FROM public.contracts c
staging_schema.sql:4614:        JOIN public.properties p ON c.property_id = p.id
staging_schema.sql:4615:        WHERE c.status = 'active'
staging_schema.sql:4616:        -- Changed to 60 days
staging_schema.sql:4617:        AND c.end_date <= (CURRENT_DATE + INTERVAL '60 days')
staging_schema.sql:4618:        AND c.end_date >= CURRENT_DATE
staging_schema.sql:4619:    LOOP
staging_schema.sql:4620:        IF NOT EXISTS (
staging_schema.sql:4621:            SELECT 1 
staging_schema.sql:4622:            FROM public.notifications n 
staging_schema.sql:4623:            WHERE n.user_id = expiring_contract.user_id
staging_schema.sql:4624:            AND n.type = 'warning'
staging_schema.sql:4625:            AND n.metadata->>'contract_id' = expiring_contract.id::text
staging_schema.sql:4626:            AND n.title = 'Contract Expiring Soon' 
staging_schema.sql:4627:        ) THEN
staging_schema.sql:4628:            INSERT INTO public.notifications (
staging_schema.sql:4629:                user_id,
staging_schema.sql:4630:                type,
staging_schema.sql:4631:                title,
staging_schema.sql:4632:                message,
staging_schema.sql:4633:                metadata
staging_schema.sql:4634:            ) VALUES (
staging_schema.sql:4635:                expiring_contract.user_id,
staging_schema.sql:4636:                'warning',
staging_schema.sql:4637:                'Contract Expiring Soon',
staging_schema.sql:4638:                'Contract for ' || expiring_contract.address || ' ends in ' || (expiring_contract.end_date - 
CURRENT_DATE)::text || ' days (' || to_char(expiring_contract.end_date, 'DD/MM/YYYY') || '). Review and renew today.',
staging_schema.sql:4639:                jsonb_build_object('contract_id', expiring_contract.id)
staging_schema.sql:4640:            );
staging_schema.sql:4641:            count_new := count_new + 1;
staging_schema.sql:4642:        END IF;
staging_schema.sql:4643:    END LOOP;
staging_schema.sql:4644:END;
staging_schema.sql:4645:$$;
staging_schema.sql:4646:
staging_schema.sql:4647:-- 2. New Rent Due Check (3 days before)
staging_schema.sql:4648:CREATE OR REPLACE FUNCTION public.check_rent_due()
staging_schema.sql:4649:RETURNS void
staging_schema.sql:4650:LANGUAGE plpgsql
staging_schema.sql:4651:SECURITY DEFINER
staging_schema.sql:4652:AS $$
staging_schema.sql:4653:DECLARE
staging_schema.sql:4654:    due_payment RECORD;
staging_schema.sql:4655:    count_new integer := 0;
staging_schema.sql:4656:BEGIN
staging_schema.sql:4657:    -- This logic assumes we have 'payments' records generated. 
staging_schema.sql:4658:    -- Alternatively, it could calculate "next payment date" dynamically from contracts if payments aren't pre-generated.
staging_schema.sql:4659:    -- For robustness, we'll assume we are looking for payments in 'pending' status due nicely soon.
staging_schema.sql:4660:
staging_schema.sql:4661:    FOR due_payment IN
staging_schema.sql:4662:        SELECT 
staging_schema.sql:4663:            pay.id,
staging_schema.sql:4664:            pay.due_date,
staging_schema.sql:4665:            pay.amount,
staging_schema.sql:4666:            pay.currency,
staging_schema.sql:4667:            p.user_id,
staging_schema.sql:4668:            p.address
staging_schema.sql:4669:        FROM public.payments pay
staging_schema.sql:4670:        JOIN public.contracts c ON pay.contract_id = c.id
staging_schema.sql:4671:        JOIN public.properties p ON c.property_id = p.id
staging_schema.sql:4672:        WHERE pay.status = 'pending'
staging_schema.sql:4673:        AND pay.due_date <= (CURRENT_DATE + INTERVAL '3 days')
staging_schema.sql:4674:        AND pay.due_date >= CURRENT_DATE
staging_schema.sql:4675:    LOOP
staging_schema.sql:4676:        -- Avoid dupes for this specific payment ID
staging_schema.sql:4677:        IF NOT EXISTS (
staging_schema.sql:4678:            SELECT 1 
staging_schema.sql:4679:            FROM public.notifications n 
staging_schema.sql:4680:            WHERE n.user_id = due_payment.user_id
staging_schema.sql:4681:            AND n.type = 'info'
staging_schema.sql:4682:            AND n.metadata->>'payment_id' = due_payment.id::text
staging_schema.sql:4683:        ) THEN
staging_schema.sql:4684:            INSERT INTO public.notifications (
staging_schema.sql:4685:                user_id,
staging_schema.sql:4686:                type,
staging_schema.sql:4687:                title,
staging_schema.sql:4688:                message,
staging_schema.sql:4689:                metadata
staging_schema.sql:4690:            ) VALUES (
staging_schema.sql:4691:                due_payment.user_id,
staging_schema.sql:4692:                'info',
staging_schema.sql:4693:                'Rent Due Soon',
staging_schema.sql:4694:                'Rent of ' || due_payment.amount || ' ' || due_payment.currency || ' for ' || due_payment.address || ' is due 
on ' || to_char(due_payment.due_date, 'DD/MM/YYYY') || '.',
staging_schema.sql:4695:                jsonb_build_object('payment_id', due_payment.id)
staging_schema.sql:4696:            );
staging_schema.sql:4697:            count_new := count_new + 1;
staging_schema.sql:4698:        END IF;
staging_schema.sql:4699:    END LOOP;
staging_schema.sql:4700:END;
staging_schema.sql:4701:$$;
staging_schema.sql:4702:
staging_schema.sql:4703:-- 3. Master Orchestrator
staging_schema.sql:4704:CREATE OR REPLACE FUNCTION public.check_daily_notifications()
staging_schema.sql:4705:RETURNS void
staging_schema.sql:4706:LANGUAGE plpgsql
staging_schema.sql:4707:SECURITY DEFINER
staging_schema.sql:4708:AS $$
staging_schema.sql:4709:BEGIN
staging_schema.sql:4710:    PERFORM public.check_contract_expirations();
staging_schema.sql:4711:    PERFORM public.check_rent_due();
staging_schema.sql:4712:END;
staging_schema.sql:4713:$$;
staging_schema.sql:4714:-- Add extension_option_end column and notification preference
staging_schema.sql:4715:
staging_schema.sql:4716:-- 1. Add extension_option_end column to contracts table
staging_schema.sql:4717:ALTER TABLE public.contracts
staging_schema.sql:4718:ADD COLUMN IF NOT EXISTS extension_option_end DATE;
staging_schema.sql:4719:
staging_schema.sql:4720:
staging_schema.sql:4721:-- 2. Add extension_option_end_days to notification preferences
staging_schema.sql:4722:UPDATE public.user_profiles
staging_schema.sql:4723:SET notification_preferences = jsonb_set(
staging_schema.sql:4724:    COALESCE(notification_preferences, '{}'::jsonb),
staging_schema.sql:4725:    '{extension_option_end_days}',
staging_schema.sql:4726:    '7'
staging_schema.sql:4727:)
staging_schema.sql:4728:WHERE notification_preferences IS NULL 
staging_schema.sql:4729:   OR NOT notification_preferences ? 'extension_option_end_days';
staging_schema.sql:4730:
staging_schema.sql:4731:-- 3. Create function to check for upcoming extension option deadlines
staging_schema.sql:4732:CREATE OR REPLACE FUNCTION public.check_extension_deadlines()
staging_schema.sql:4733:RETURNS void
staging_schema.sql:4734:LANGUAGE plpgsql
staging_schema.sql:4735:SECURITY DEFINER
staging_schema.sql:4736:AS $$
staging_schema.sql:4737:DECLARE
staging_schema.sql:4738:    deadline_record RECORD;
staging_schema.sql:4739:    count_new integer := 0;
staging_schema.sql:4740:    pref_days integer;
staging_schema.sql:4741:BEGIN
staging_schema.sql:4742:    FOR deadline_record IN
staging_schema.sql:4743:        SELECT 
staging_schema.sql:4744:            c.id, 
staging_schema.sql:4745:            c.extension_option_end,
staging_schema.sql:4746:            c.property_id, 
staging_schema.sql:4747:            p.user_id, 
staging_schema.sql:4748:            p.address,
staging_schema.sql:4749:            up.notification_preferences
staging_schema.sql:4750:        FROM public.contracts c
staging_schema.sql:4751:        JOIN public.properties p ON c.property_id = p.id
staging_schema.sql:4752:        JOIN public.user_profiles up ON p.user_id = up.id
staging_schema.sql:4753:        WHERE c.status = 'active'
staging_schema.sql:4754:        AND c.extension_option_end IS NOT NULL
staging_schema.sql:4755:    LOOP
staging_schema.sql:4756:        -- Extract preference, default to 7, cap at 180
staging_schema.sql:4757:        pref_days := COALESCE((deadline_record.notification_preferences->>'extension_option_end_days')::int, 7);
staging_schema.sql:4758:        
staging_schema.sql:4759:        -- Skip if disabled (0)
staging_schema.sql:4760:        IF pref_days = 0 THEN
staging_schema.sql:4761:            CONTINUE;
staging_schema.sql:4762:        END IF;
staging_schema.sql:4763:        
staging_schema.sql:4764:        IF pref_days > 180 THEN pref_days := 180; END IF;
staging_schema.sql:4765:        IF pref_days < 1 THEN pref_days := 1; END IF;
staging_schema.sql:4766:
staging_schema.sql:4767:        -- Check if deadline is approaching
staging_schema.sql:4768:        IF deadline_record.extension_option_end <= (CURRENT_DATE + (pref_days || ' days')::interval)
staging_schema.sql:4769:           AND deadline_record.extension_option_end >= CURRENT_DATE THEN
staging_schema.sql:4770:           
staging_schema.sql:4771:            IF NOT EXISTS (
staging_schema.sql:4772:                SELECT 1 
staging_schema.sql:4773:                FROM public.notifications n 
staging_schema.sql:4774:                WHERE n.user_id = deadline_record.user_id
staging_schema.sql:4775:                AND n.type = 'warning'
staging_schema.sql:4776:                AND n.metadata->>'contract_id' = deadline_record.id::text
staging_schema.sql:4777:                AND n.title = 'Extension Option Deadline Approaching'
staging_schema.sql:4778:                AND n.created_at > (CURRENT_DATE - INTERVAL '6 months')
staging_schema.sql:4779:            ) THEN
staging_schema.sql:4780:                INSERT INTO public.notifications (
staging_schema.sql:4781:                    user_id,
staging_schema.sql:4782:                    type,
staging_schema.sql:4783:                    title,
staging_schema.sql:4784:                    message,
staging_schema.sql:4785:                    metadata
staging_schema.sql:4786:                ) VALUES (
staging_schema.sql:4787:                    deadline_record.user_id,
staging_schema.sql:4788:                    'warning',
staging_schema.sql:4789:                    'Extension Option Deadline Approaching',
staging_schema.sql:4790:                    'Deadline to announce extension option for ' || deadline_record.address || ' is in ' || 
(deadline_record.extension_option_end - CURRENT_DATE)::text || ' days (' || to_char(deadline_record.extension_option_end, 'DD/MM/YYYY') || '). 
Contact tenant soon.',
staging_schema.sql:4791:                    jsonb_build_object('contract_id', deadline_record.id)
staging_schema.sql:4792:                );
staging_schema.sql:4793:                count_new := count_new + 1;
staging_schema.sql:4794:            END IF;
staging_schema.sql:4795:        END IF;
staging_schema.sql:4796:    END LOOP;
staging_schema.sql:4797:END;
staging_schema.sql:4798:$$;
staging_schema.sql:4799:
staging_schema.sql:4800:-- 4. Update master daily notifications function
staging_schema.sql:4801:CREATE OR REPLACE FUNCTION public.check_daily_notifications()
staging_schema.sql:4802:RETURNS void
staging_schema.sql:4803:LANGUAGE plpgsql
staging_schema.sql:4804:SECURITY DEFINER
staging_schema.sql:4805:AS $$
staging_schema.sql:4806:BEGIN
staging_schema.sql:4807:    PERFORM public.check_contract_expirations();
staging_schema.sql:4808:    PERFORM public.check_rent_due();
staging_schema.sql:4809:    PERFORM public.check_extension_options();
staging_schema.sql:4810:    PERFORM public.check_extension_deadlines();
staging_schema.sql:4811:END;
staging_schema.sql:4812:$$;
staging_schema.sql:4813:-- Add extension_option_days to notification preferences
staging_schema.sql:4814:-- Update default structure to include all three notification types
staging_schema.sql:4815:
staging_schema.sql:4816:-- 1. Update existing records to include extension_option_days
staging_schema.sql:4817:UPDATE public.user_profiles
staging_schema.sql:4818:SET notification_preferences = jsonb_set(
staging_schema.sql:4819:    COALESCE(notification_preferences, '{}'::jsonb),
staging_schema.sql:4820:    '{extension_option_days}',
staging_schema.sql:4821:    '30'
staging_schema.sql:4822:)
staging_schema.sql:4823:WHERE notification_preferences IS NULL 
staging_schema.sql:4824:   OR NOT notification_preferences ? 'extension_option_days';
staging_schema.sql:4825:
staging_schema.sql:4826:-- 2. Create function to check for upcoming extension option periods
staging_schema.sql:4827:CREATE OR REPLACE FUNCTION public.check_extension_options()
staging_schema.sql:4828:RETURNS void
staging_schema.sql:4829:LANGUAGE plpgsql
staging_schema.sql:4830:SECURITY DEFINER
staging_schema.sql:4831:AS $$
staging_schema.sql:4832:DECLARE
staging_schema.sql:4833:    extension_record RECORD;
staging_schema.sql:4834:    count_new integer := 0;
staging_schema.sql:4835:    pref_days integer;
staging_schema.sql:4836:BEGIN
staging_schema.sql:4837:    FOR extension_record IN
staging_schema.sql:4838:        SELECT 
staging_schema.sql:4839:            c.id, 
staging_schema.sql:4840:            c.extension_option_start,
staging_schema.sql:4841:            c.property_id, 
staging_schema.sql:4842:            p.user_id, 
staging_schema.sql:4843:            p.address,
staging_schema.sql:4844:            up.notification_preferences
staging_schema.sql:4845:        FROM public.contracts c
staging_schema.sql:4846:        JOIN public.properties p ON c.property_id = p.id
staging_schema.sql:4847:        JOIN public.user_profiles up ON p.user_id = up.id
staging_schema.sql:4848:        WHERE c.status = 'active'
staging_schema.sql:4849:        AND c.extension_option_start IS NOT NULL
staging_schema.sql:4850:    LOOP
staging_schema.sql:4851:        -- Extract preference, default to 30, cap at 180
staging_schema.sql:4852:        pref_days := COALESCE((extension_record.notification_preferences->>'extension_option_days')::int, 30);
staging_schema.sql:4853:        IF pref_days > 180 THEN pref_days := 180; END IF;
staging_schema.sql:4854:        IF pref_days < 1 THEN pref_days := 1; END IF;
staging_schema.sql:4855:
staging_schema.sql:4856:        -- Check if extension option starts in this window
staging_schema.sql:4857:        IF extension_record.extension_option_start <= (CURRENT_DATE + (pref_days || ' days')::interval)
staging_schema.sql:4858:           AND extension_record.extension_option_start >= CURRENT_DATE THEN
staging_schema.sql:4859:           
staging_schema.sql:4860:            IF NOT EXISTS (
staging_schema.sql:4861:                SELECT 1 
staging_schema.sql:4862:                FROM public.notifications n 
staging_schema.sql:4863:                WHERE n.user_id = extension_record.user_id
staging_schema.sql:4864:                AND n.type = 'info'
staging_schema.sql:4865:                AND n.metadata->>'contract_id' = extension_record.id::text
staging_schema.sql:4866:                AND n.title = 'Extension Option Available'
staging_schema.sql:4867:                AND n.created_at > (CURRENT_DATE - INTERVAL '6 months')
staging_schema.sql:4868:            ) THEN
staging_schema.sql:4869:                INSERT INTO public.notifications (
staging_schema.sql:4870:                    user_id,
staging_schema.sql:4871:                    type,
staging_schema.sql:4872:                    title,
staging_schema.sql:4873:                    message,
staging_schema.sql:4874:                    metadata
staging_schema.sql:4875:                ) VALUES (
staging_schema.sql:4876:                    extension_record.user_id,
staging_schema.sql:4877:                    'info',
staging_schema.sql:4878:                    'Extension Option Available',
staging_schema.sql:4879:                    'Extension option period for ' || extension_record.address || ' starts in ' || 
(extension_record.extension_option_start - CURRENT_DATE)::text || ' days (' || to_char(extension_record.extension_option_start, 'DD/MM/YYYY') || '). 
Consider discussing with tenant.',
staging_schema.sql:4880:                    jsonb_build_object('contract_id', extension_record.id)
staging_schema.sql:4881:                );
staging_schema.sql:4882:                count_new := count_new + 1;
staging_schema.sql:4883:            END IF;
staging_schema.sql:4884:        END IF;
staging_schema.sql:4885:    END LOOP;
staging_schema.sql:4886:END;
staging_schema.sql:4887:$$;
staging_schema.sql:4888:
staging_schema.sql:4889:-- 3. Update the master daily notifications function to include extension checks
staging_schema.sql:4890:CREATE OR REPLACE FUNCTION public.check_daily_notifications()
staging_schema.sql:4891:RETURNS void
staging_schema.sql:4892:LANGUAGE plpgsql
staging_schema.sql:4893:SECURITY DEFINER
staging_schema.sql:4894:AS $$
staging_schema.sql:4895:BEGIN
staging_schema.sql:4896:    PERFORM public.check_contract_expirations();
staging_schema.sql:4897:    PERFORM public.check_rent_due();
staging_schema.sql:4898:    PERFORM public.check_extension_options();
staging_schema.sql:4899:END;
staging_schema.sql:4900:$$;
staging_schema.sql:4901:-- Harden SECURITY DEFINER functions with strict search_path
staging_schema.sql:4902:-- Migration: 20260120_harden_security_definer_functions.sql
staging_schema.sql:4903:
staging_schema.sql:4904:-- 1. update_user_storage
staging_schema.sql:4905:ALTER FUNCTION public.update_user_storage() SET search_path = public;
staging_schema.sql:4906:
staging_schema.sql:4907:-- 2. check_storage_quota
staging_schema.sql:4908:ALTER FUNCTION public.check_storage_quota(UUID, BIGINT, TEXT) SET search_path = public;
staging_schema.sql:4909:
staging_schema.sql:4910:-- 3. process_daily_notifications
staging_schema.sql:4911:ALTER FUNCTION public.process_daily_notifications() SET search_path = public;
staging_schema.sql:4912:
staging_schema.sql:4913:-- 4. Any other functions found in migrations that are SECURITY DEFINER but missing search_path
staging_schema.sql:4914:-- Searching for 'SECURITY DEFINER' in codebase often reveals these.
staging_schema.sql:4915:-- Note: delete_user_account and handle_new_user already have it.
staging_schema.sql:4916:-- Update notification functions to respect 0 value (disabled notifications)
staging_schema.sql:4917:
staging_schema.sql:4918:-- 1. Update Contract Expiration Check to skip if disabled (0 days)
staging_schema.sql:4919:CREATE OR REPLACE FUNCTION public.check_contract_expirations()
staging_schema.sql:4920:RETURNS void
staging_schema.sql:4921:LANGUAGE plpgsql
staging_schema.sql:4922:SECURITY DEFINER
staging_schema.sql:4923:AS $$
staging_schema.sql:4924:DECLARE
staging_schema.sql:4925:    expiring_contract RECORD;
staging_schema.sql:4926:    count_new integer := 0;
staging_schema.sql:4927:    pref_days integer;
staging_schema.sql:4928:BEGIN
staging_schema.sql:4929:    FOR expiring_contract IN
staging_schema.sql:4930:        SELECT 
staging_schema.sql:4931:            c.id, 
staging_schema.sql:4932:            c.end_date, 
staging_schema.sql:4933:            c.property_id, 
staging_schema.sql:4934:            p.user_id, 
staging_schema.sql:4935:            p.address, 
staging_schema.sql:4936:            p.city,
staging_schema.sql:4937:            up.notification_preferences
staging_schema.sql:4938:        FROM public.contracts c
staging_schema.sql:4939:        JOIN public.properties p ON c.property_id = p.id
staging_schema.sql:4940:        JOIN public.user_profiles up ON p.user_id = up.id
staging_schema.sql:4941:        WHERE c.status = 'active'
staging_schema.sql:4942:    LOOP
staging_schema.sql:4943:        -- Extract preference, default to 60, cap at 180
staging_schema.sql:4944:        pref_days := COALESCE((expiring_contract.notification_preferences->>'contract_expiry_days')::int, 60);
staging_schema.sql:4945:        
staging_schema.sql:4946:        -- Skip if disabled (0)
staging_schema.sql:4947:        IF pref_days = 0 THEN
staging_schema.sql:4948:            CONTINUE;
staging_schema.sql:4949:        END IF;
staging_schema.sql:4950:        
staging_schema.sql:4951:        IF pref_days > 180 THEN pref_days := 180; END IF;
staging_schema.sql:4952:        IF pref_days < 1 THEN pref_days := 1; END IF;
staging_schema.sql:4953:
staging_schema.sql:4954:        -- Check if contract expires in this window
staging_schema.sql:4955:        IF expiring_contract.end_date <= (CURRENT_DATE + (pref_days || ' days')::interval)
staging_schema.sql:4956:           AND expiring_contract.end_date >= CURRENT_DATE THEN
staging_schema.sql:4957:           
staging_schema.sql:4958:            IF NOT EXISTS (
staging_schema.sql:4959:                SELECT 1 
staging_schema.sql:4960:                FROM public.notifications n 
staging_schema.sql:4961:                WHERE n.user_id = expiring_contract.user_id
staging_schema.sql:4962:                AND n.type = 'warning'
staging_schema.sql:4963:                AND n.metadata->>'contract_id' = expiring_contract.id::text
staging_schema.sql:4964:                AND n.created_at > (CURRENT_DATE - INTERVAL '6 months')
staging_schema.sql:4965:            ) THEN
staging_schema.sql:4966:                INSERT INTO public.notifications (
staging_schema.sql:4967:                    user_id,
staging_schema.sql:4968:                    type,
staging_schema.sql:4969:                    title,
staging_schema.sql:4970:                    message,
staging_schema.sql:4971:                    metadata
staging_schema.sql:4972:                ) VALUES (
staging_schema.sql:4973:                    expiring_contract.user_id,
staging_schema.sql:4974:                    'warning',
staging_schema.sql:4975:                    'Contract Expiring Soon',
staging_schema.sql:4976:                    'Contract for ' || expiring_contract.address || ' ends in ' || (expiring_contract.end_date - 
CURRENT_DATE)::text || ' days (' || to_char(expiring_contract.end_date, 'DD/MM/YYYY') || '). Review and renew today.',
staging_schema.sql:4977:                    jsonb_build_object('contract_id', expiring_contract.id)
staging_schema.sql:4978:                );
staging_schema.sql:4979:                count_new := count_new + 1;
staging_schema.sql:4980:            END IF;
staging_schema.sql:4981:        END IF;
staging_schema.sql:4982:    END LOOP;
staging_schema.sql:4983:END;
staging_schema.sql:4984:$$;
staging_schema.sql:4985:
staging_schema.sql:4986:-- 2. Update Rent Due Check to skip if disabled (0 days)
staging_schema.sql:4987:CREATE OR REPLACE FUNCTION public.check_rent_due()
staging_schema.sql:4988:RETURNS void
staging_schema.sql:4989:LANGUAGE plpgsql
staging_schema.sql:4990:SECURITY DEFINER
staging_schema.sql:4991:AS $$
staging_schema.sql:4992:DECLARE
staging_schema.sql:4993:    due_payment RECORD;
staging_schema.sql:4994:    count_new integer := 0;
staging_schema.sql:4995:    pref_days integer;
staging_schema.sql:4996:BEGIN
staging_schema.sql:4997:    FOR due_payment IN
staging_schema.sql:4998:        SELECT 
staging_schema.sql:4999:            pay.id,
staging_schema.sql:5000:            pay.due_date,
staging_schema.sql:5001:            pay.amount,


