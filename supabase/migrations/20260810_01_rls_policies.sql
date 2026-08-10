-- RLS Policies Migration
-- This migration adds Row Level Security policies to secure the database
-- It creates helper functions and policies for role-based access control

-- Helper Functions with SECURITY DEFINER and fixed search_path

-- Function: is_admin()
-- Returns true if the authenticated user has profiles.role = 'admin'
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: is_team_member(target_team_id UUID)
-- Returns true if the authenticated user is either:
-- - the team leader (teams.leader_id)
-- - included in the team members array (teams.members)
CREATE OR REPLACE FUNCTION public.is_team_member(target_team_id UUID)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.teams
    WHERE id = target_team_id
    AND (
      leader_id = auth.uid()
      OR members @> ARRAY[auth.uid()]::UUID[]
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: is_same_team_member(target_profile_id UUID)
-- Returns true if the authenticated user and target profile are in the same team
CREATE OR REPLACE FUNCTION public.is_same_team_member(target_profile_id UUID)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.teams
    WHERE (
      leader_id = auth.uid()
      OR members @> ARRAY[auth.uid()]::UUID[]
    )
    AND (
      leader_id = target_profile_id
      OR members @> ARRAY[target_profile_id]::UUID[]
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RLS Policies for profiles table
-- Admin can read all profiles. 
-- Normal users can read their own profile and profiles of their team members.
-- No client insert/update/delete policy (handled by auth trigger and admin functions).

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    is_admin() OR id = auth.uid() OR is_same_team_member(id)
  );

-- RLS Policies for teams table
-- Admin can read/create/update/delete all teams.
-- Students can read only a team where they are leader or listed in members.
-- No student/team-leader write access.

DROP POLICY IF EXISTS "teams_select_policy" ON public.teams;
CREATE POLICY "teams_select_policy" ON public.teams
  FOR SELECT
  TO authenticated
  USING (
    is_admin() OR is_team_member(id)
  );

DROP POLICY IF EXISTS "teams_insert_policy" ON public.teams;
CREATE POLICY "teams_insert_policy" ON public.teams
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "teams_update_policy" ON public.teams;
CREATE POLICY "teams_update_policy" ON public.teams
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "teams_delete_policy" ON public.teams;
CREATE POLICY "teams_delete_policy" ON public.teams
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- RLS Policies for tasks table
-- Admin can read/create/update/delete all tasks.
-- Students can read tasks only for their own team and update tasks only for their own team.

DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;
CREATE POLICY "tasks_select_policy" ON public.tasks
  FOR SELECT
  TO authenticated
  USING (
    is_admin() OR is_team_member(team_id)
  );

DROP POLICY IF EXISTS "tasks_insert_policy" ON public.tasks;
CREATE POLICY "tasks_insert_policy" ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "tasks_update_policy" ON public.tasks;
CREATE POLICY "tasks_update_policy" ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (
    is_admin() OR is_team_member(team_id)
  )
  WITH CHECK (
    is_admin() OR is_team_member(team_id)
  );

DROP POLICY IF EXISTS "tasks_delete_policy" ON public.tasks;
CREATE POLICY "tasks_delete_policy" ON public.tasks
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- RLS Policies for messages table
-- Admin can read/insert all messages.
-- Students can read messages only for their own team and insert a message only into their own team with user_id = auth.uid().
-- No update/delete policy for anyone.

DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;
CREATE POLICY "messages_select_policy" ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    is_admin() OR is_team_member(team_id)
  );

DROP POLICY IF EXISTS "messages_insert_policy" ON public.messages;
CREATE POLICY "messages_insert_policy" ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin() OR (is_team_member(team_id) AND user_id = auth.uid())
  );

-- No update or delete policies for messages (admin-only through direct database access if needed)

-- Table and Column Permissions for authenticated role

-- For tasks table: revoke general update permission, grant update only for status and completed_at
REVOKE UPDATE ON public.tasks FROM authenticated;
GRANT UPDATE (status, completed_at) ON public.tasks TO authenticated;

-- Ensure RLS is still enabled on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
