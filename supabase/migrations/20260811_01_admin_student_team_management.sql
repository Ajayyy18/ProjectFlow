-- Admin Student and Team Management Migration
-- This migration adds batch_number support and team batch context

-- Add nullable batch_number column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS batch_number INTEGER NULL;

-- Drop constraint if it exists, then add check constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_batch_number_positive;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_batch_number_positive 
CHECK (batch_number IS NULL OR batch_number > 0);

-- Add batch context columns to teams table
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS branch TEXT NULL;

ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS batch_number INTEGER NULL;

-- Drop constraint if it exists, then add check constraint
ALTER TABLE public.teams 
DROP CONSTRAINT IF EXISTS teams_batch_number_positive;

ALTER TABLE public.teams 
ADD CONSTRAINT teams_batch_number_positive 
CHECK (batch_number IS NULL OR batch_number > 0);

-- Admin-only RLS update policy for profiles
-- Only admins can update profiles, and only the batch_number field
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Grant update permission on batch_number column only to authenticated users
-- RLS policy will ensure only admins can actually use this permission
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (batch_number) ON public.profiles TO authenticated;

-- Grant update permission on teams batch context columns to authenticated users
-- RLS policies will ensure only admins can actually use this permission
REVOKE UPDATE ON public.teams FROM authenticated;
GRANT UPDATE (name, leader_id, members, branch, batch_number) ON public.teams TO authenticated;
