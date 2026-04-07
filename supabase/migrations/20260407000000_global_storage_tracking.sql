-- Migration: 20260407000000_global_storage_tracking.sql
-- Description: Implement native storage.objects triggers for granular file count and volume tracking

BEGIN;

-- 1. ADD NEW COLUMNS TO user_storage_usage
ALTER TABLE public.user_storage_usage
ADD COLUMN IF NOT EXISTS media_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS utilities_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS maintenance_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS documents_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS protocols_bytes BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS protocols_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tenant_bytes BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS tenant_count INTEGER DEFAULT 0;

-- 2. CREATE NATIVE STORAGE TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.update_native_storage_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_size BIGINT := 0;
    v_owner UUID;
    v_bucket TEXT;
    
    -- Variables for dynamic queries
    v_bytes_col TEXT;
    v_count_col TEXT;
BEGIN
    -- Determine the operational parameters
    IF TG_OP = 'INSERT' THEN
        v_size := COALESCE((NEW.metadata->>'size')::BIGINT, 0);
        v_owner := NEW.owner;
        v_bucket := NEW.bucket_id;
    ELSIF TG_OP = 'DELETE' THEN
        v_size := COALESCE((OLD.metadata->>'size')::BIGINT, 0);
        v_owner := OLD.owner;
        v_bucket := OLD.bucket_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Only trigger if the size actually changed
        IF COALESCE(NEW.metadata->>'size', '0') = COALESCE(OLD.metadata->>'size', '0') THEN
            RETURN NEW;
        END IF;

        -- We handle updates as: Add new size, deduct old size. But it's easier to just calculate delta.
        v_size := COALESCE((NEW.metadata->>'size')::BIGINT, 0) - COALESCE((OLD.metadata->>'size')::BIGINT, 0);
        v_owner := NEW.owner;
        v_bucket := NEW.bucket_id;
    END IF;

    -- If no owner or no size, do nothing (Anonymous uploads without owner cannot be billed)
    IF v_owner IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- The property-documents bucket is handled by its own application logic trigger 
    -- 'update_storage_on_document_change' which correctly partitions utilities vs maintenance.
    -- We skip it here to avoid double counting!
    IF v_bucket = 'property-documents' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Map buckets to their respective storage columns
    IF v_bucket = 'property-images' THEN
        v_bytes_col := 'media_bytes';
        v_count_col := 'media_count';
    ELSIF v_bucket = 'protocol_evidence' THEN
        v_bytes_col := 'protocols_bytes';
        v_count_col := 'protocols_count';
    ELSIF v_bucket = 'tenant-documents' THEN
        v_bytes_col := 'tenant_bytes';
        v_count_col := 'tenant_count';
    -- Fallback for any other bucket (e.g. avatars, chat archives)
    ELSE
        v_bytes_col := 'documents_bytes';
        v_count_col := 'documents_count';
    END IF;

    -- Apply the delta (For delete, v_size will be passed as positive, so we subtract).
    -- Wait! If UPDATE, v_size is the delta (can be negative or positive). We just add it!
    -- If DELETE, we want to subtract.
    
    IF TG_OP = 'INSERT' THEN
        EXECUTE format('
            INSERT INTO public.user_storage_usage (user_id, total_bytes, file_count, %I, %I)
            VALUES ($1, $2, 1, $2, 1)
            ON CONFLICT (user_id) DO UPDATE SET
                total_bytes = user_storage_usage.total_bytes + $2,
                file_count = user_storage_usage.file_count + 1,
                %I = user_storage_usage.%I + $2,
                %I = user_storage_usage.%I + 1,
                updated_at = NOW()
        ', v_bytes_col, v_count_col, v_bytes_col, v_bytes_col, v_count_col, v_count_col) USING v_owner, v_size;

    ELSIF TG_OP = 'DELETE' THEN
        EXECUTE format('
            UPDATE public.user_storage_usage
            SET 
                total_bytes = GREATEST(0, total_bytes - $1),
                file_count = GREATEST(0, file_count - 1),
                %I = GREATEST(0, %I - $1),
                %I = GREATEST(0, %I - 1),
                updated_at = NOW()
            WHERE user_id = $2
        ', v_bytes_col, v_bytes_col, v_count_col, v_count_col) USING v_size, v_owner;
        
    ELSIF TG_OP = 'UPDATE' THEN
        EXECUTE format('
            UPDATE public.user_storage_usage
            SET 
                total_bytes = GREATEST(0, total_bytes + $1),
                -- file_count does not change on update
                %I = GREATEST(0, %I + $1),
                updated_at = NOW()
            WHERE user_id = $2
        ', v_bytes_col, v_bytes_col) USING v_size, v_owner;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 3. APPLY TRIGGER TO STORAGE OBJECTS
DROP TRIGGER IF EXISTS trigger_update_native_storage_usage ON storage.objects;

CREATE TRIGGER trigger_update_native_storage_usage
AFTER INSERT OR UPDATE OR DELETE ON storage.objects
FOR EACH ROW EXECUTE FUNCTION public.update_native_storage_usage();

-- 4. UPDATE APPLICATION TRIGGER TO HANDLE COUNTS TOO
-- We need to replace the old 'update_user_storage' so it increments the specific *_count columns
CREATE OR REPLACE FUNCTION public.update_user_storage()
RETURNS TRIGGER AS $$
DECLARE
    v_col TEXT;
    v_count_col TEXT;
    v_size BIGINT;
    v_user_id UUID;
    v_cat TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_size := NEW.file_size;
        v_user_id := NEW.user_id;
        v_cat := NEW.category;
    ELSE
        v_size := OLD.file_size;
        v_user_id := OLD.user_id;
        v_cat := OLD.category;
    END IF;

    IF v_cat IN ('photo', 'video') THEN
        v_col := 'media_bytes';
        v_count_col := 'media_count';
    ELSIF v_cat LIKE 'utility_%' THEN
        v_col := 'utilities_bytes';
        v_count_col := 'utilities_count';
    ELSIF v_cat = 'maintenance' THEN
        v_col := 'maintenance_bytes';
        v_count_col := 'maintenance_count';
    ELSE
        v_col := 'documents_bytes';
        v_count_col := 'documents_count';
    END IF;

    IF TG_OP = 'INSERT' THEN
        EXECUTE format('
            INSERT INTO user_storage_usage (user_id, total_bytes, file_count, %I, %I)
            VALUES ($1, $2, 1, $2, 1)
            ON CONFLICT (user_id) DO UPDATE SET
                total_bytes = user_storage_usage.total_bytes + $2,
                file_count = user_storage_usage.file_count + 1,
                %I = user_storage_usage.%I + $2,
                %I = user_storage_usage.%I + 1,
                updated_at = NOW()
        ', v_col, v_count_col, v_col, v_col, v_count_col, v_count_col) USING v_user_id, v_size;
            
    ELSIF TG_OP = 'DELETE' THEN
        EXECUTE format('
            UPDATE user_storage_usage
            SET 
                total_bytes = GREATEST(0, total_bytes - $1),
                file_count = GREATEST(0, file_count - 1),
                %I = GREATEST(0, %I - $1),
                %I = GREATEST(0, %I - 1),
                updated_at = NOW()
            WHERE user_id = $2
        ', v_col, v_col, v_count_col, v_count_col) USING v_size, v_user_id;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4.5. UPDATE DASHBOARD GETTER TO USE NATIVE STORAGE ROW
CREATE OR REPLACE FUNCTION public.get_property_document_counts(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'media', COALESCE(media_count, 0),
        'utilities', COALESCE(utilities_count, 0),
        'maintenance', COALESCE(maintenance_count, 0),
        'documents', COALESCE(documents_count, 0) + COALESCE(protocols_count, 0) + COALESCE(tenant_count, 0) 
    ) INTO result
    FROM public.user_storage_usage
    WHERE user_id = p_user_id;

    IF result IS NULL THEN
        RETURN jsonb_build_object('media', 0, 'utilities', 0, 'maintenance', 0, 'documents', 0);
    END IF;

    RETURN result;
END;
$$;


-- 5. RECALCULATION & RESYNC SCRIPT
-- Since existing databases have drifted, we recalculate everything exactly as the triggers would.
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Reset everyone
    UPDATE public.user_storage_usage SET
        total_bytes = 0,
        file_count = 0,
        media_bytes = 0, media_count = 0,
        utilities_bytes = 0, utilities_count = 0,
        maintenance_bytes = 0, maintenance_count = 0,
        documents_bytes = 0, documents_count = 0,
        protocols_bytes = 0, protocols_count = 0,
        tenant_bytes = 0, tenant_count = 0;

    -- Aggregation 1: property_documents
    FOR r IN (
        SELECT user_id, category, SUM(file_size) as s_bytes, COUNT(*) as s_count
        FROM public.property_documents
        GROUP BY user_id, category
    ) LOOP
        IF r.category IN ('photo', 'video') THEN
            UPDATE public.user_storage_usage 
               SET total_bytes = total_bytes + r.s_bytes, file_count = file_count + r.s_count,
                   media_bytes = media_bytes + r.s_bytes, media_count = media_count + r.s_count
             WHERE user_id = r.user_id;
        ELSIF r.category LIKE 'utility_%' THEN
            UPDATE public.user_storage_usage 
               SET total_bytes = total_bytes + r.s_bytes, file_count = file_count + r.s_count,
                   utilities_bytes = utilities_bytes + r.s_bytes, utilities_count = utilities_count + r.s_count
             WHERE user_id = r.user_id;
        ELSIF r.category = 'maintenance' THEN
            UPDATE public.user_storage_usage 
               SET total_bytes = total_bytes + r.s_bytes, file_count = file_count + r.s_count,
                   maintenance_bytes = maintenance_bytes + r.s_bytes, maintenance_count = maintenance_count + r.s_count
             WHERE user_id = r.user_id;
        ELSE
            UPDATE public.user_storage_usage 
               SET total_bytes = total_bytes + r.s_bytes, file_count = file_count + r.s_count,
                   documents_bytes = documents_bytes + r.s_bytes, documents_count = documents_count + r.s_count
             WHERE user_id = r.user_id;
        END IF;
    END LOOP;

    -- Aggregation 2: storage.objects (everything else)
    FOR r IN (
        SELECT owner, bucket_id, SUM((metadata->>'size')::BIGINT) as s_bytes, COUNT(*) as s_count
        FROM storage.objects
        WHERE owner IS NOT NULL AND bucket_id != 'property-documents' AND owner IN (SELECT id FROM auth.users)
        GROUP BY owner, bucket_id
    ) LOOP
        -- Ensure row exists just in case
        INSERT INTO public.user_storage_usage (user_id) VALUES (r.owner) ON CONFLICT DO NOTHING;

        IF r.bucket_id = 'property-images' THEN
            UPDATE public.user_storage_usage 
               SET total_bytes = total_bytes + r.s_bytes, file_count = file_count + r.s_count,
                   media_bytes = media_bytes + r.s_bytes, media_count = media_count + r.s_count
             WHERE user_id = r.owner;
        ELSIF r.bucket_id = 'protocol_evidence' THEN
            UPDATE public.user_storage_usage 
               SET total_bytes = total_bytes + r.s_bytes, file_count = file_count + r.s_count,
                   protocols_bytes = protocols_bytes + r.s_bytes, protocols_count = protocols_count + r.s_count
             WHERE user_id = r.owner;
        ELSIF r.bucket_id = 'tenant-documents' THEN
            UPDATE public.user_storage_usage 
               SET total_bytes = total_bytes + r.s_bytes, file_count = file_count + r.s_count,
                   tenant_bytes = tenant_bytes + r.s_bytes, tenant_count = tenant_count + r.s_count
             WHERE user_id = r.owner;
        ELSE
            UPDATE public.user_storage_usage 
               SET total_bytes = total_bytes + r.s_bytes, file_count = file_count + r.s_count,
                   documents_bytes = documents_bytes + r.s_bytes, documents_count = documents_count + r.s_count
             WHERE user_id = r.owner;
        END IF;
    END LOOP;

END $$;

COMMIT;

-- Inform PostgREST
NOTIFY pgrst, 'reload schema';
