-- VERIFICATION SCRIPT
-- Run this to confirm RLS is active and correct

SELECT tablename, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('properties', 'contracts', 'tenants', 'payments')
ORDER BY tablename, cmd;

-- EXPECTED OUTPUT:
-- For each table, you should see 4 rows: DELETE, INSERT, SELECT, UPDATE.
-- The 'qual' and 'with_check' columns should contain (user_id = auth.uid()).
