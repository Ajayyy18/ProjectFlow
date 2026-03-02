-- Check RLS policies for teams table
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'teams';

-- Check if RLS is enabled
SELECT
    relname AS table_name,
    relrowsecurity AS rls_enabled,
    relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relname = 'teams';

-- Test policy with current user
SELECT current_user;
SELECT is_admin();  -- If this function exists
SELECT * FROM teams;  -- See what the current user can access
