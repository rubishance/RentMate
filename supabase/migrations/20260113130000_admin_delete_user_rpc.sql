-- ============================================
-- 5. Admin Delete User RPC
-- ============================================

-- Function to delete user from auth.users (cascades to all other tables)
-- Note: modifying auth.users usually requires superuser or specific grants.
-- Usage: supabase.rpc('delete_user_account', { target_user_id: '...' })

CREATE OR REPLACE FUNCTION delete_user_account(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth -- vital for accessing auth schema
AS $$
BEGIN
    -- 1. Check if requester is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access Denied: Only Admins can delete users.';
    END IF;
    
    -- 2. Prevent deleting yourself
    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot delete your own account via this function.';
    END IF;

    -- 3. Delete from auth.users
    -- This triggers CASCADE to user_profiles -> properties, etc.
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;
