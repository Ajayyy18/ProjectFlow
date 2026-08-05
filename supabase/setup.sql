-- Comprehensive fix for all permission and data issues
-- Run this in Supabase SQL Editor to fix everything

-- Step 1: Grant table-level permissions to authenticated role
GRANT SELECT ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;
GRANT DELETE ON public.profiles TO authenticated;

GRANT SELECT ON public.teams TO authenticated;
GRANT INSERT ON public.teams TO authenticated;
GRANT UPDATE ON public.teams TO authenticated;
GRANT DELETE ON public.teams TO authenticated;

GRANT SELECT ON public.tasks TO authenticated;
GRANT INSERT ON public.tasks TO authenticated;
GRANT UPDATE ON public.tasks TO authenticated;
GRANT DELETE ON public.tasks TO authenticated;

GRANT SELECT ON public.messages TO authenticated;
GRANT INSERT ON public.messages TO authenticated;
GRANT DELETE ON public.messages TO authenticated;

-- Step 2: Ensure the user has a profile
INSERT INTO public.profiles (id, email, full_name, role, roll_number, branch)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', 'User'),
  COALESCE(raw_user_meta_data->>'role', 'student')::user_role,
  raw_user_meta_data->>'roll_number',
  raw_user_meta_data->>'branch'
FROM auth.users
WHERE id = 'e678edb0-663c-4d0b-ad59-462a940e0bd3'
ON CONFLICT (id) DO NOTHING;

-- Step 3: Set the user as admin (optional - remove if you want them as student)
UPDATE public.profiles 
SET role = 'admin'::user_role 
WHERE id = 'e678edb0-663c-4d0b-ad59-462a940e0bd3';

-- Step 3.5: Add RLS policies for tasks table
DROP POLICY IF EXISTS "Tasks are viewable by team members" ON tasks;
CREATE POLICY "Tasks are viewable by team members" ON tasks
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
CREATE POLICY "Users can update their own tasks" ON tasks
  FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can insert tasks" ON tasks;
CREATE POLICY "Admins can insert tasks" ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'::user_role
  ));

DROP POLICY IF EXISTS "Admins can delete tasks" ON tasks;
CREATE POLICY "Admins can delete tasks" ON tasks
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'::user_role
  ));

-- Step 4: Verify the profile exists
SELECT * FROM public.profiles WHERE id = 'e678edb0-663c-4d0b-ad59-462a940e0bd3';

-- Step 5: Verify permissions
SELECT 
  table_name,
  privilege_type,
  grantee
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee = 'authenticated'
  AND table_name IN ('profiles', 'teams', 'tasks', 'messages');
