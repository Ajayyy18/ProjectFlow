-- Task Assignment Migration
-- This migration updates the tasks table for proper task assignment

-- Rename existing deadline column to due_date if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'deadline'
  ) THEN
    ALTER TABLE public.tasks RENAME COLUMN deadline TO due_date;
  END IF;
END $$;

-- Add priority column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'priority'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN priority TEXT DEFAULT 'medium';
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_priority_check
      CHECK (priority IN ('low', 'medium', 'high'));
  END IF;
END $$;

-- Update status constraint to include overdue
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue'));

-- Create index on team_id for faster queries
CREATE INDEX IF NOT EXISTS idx_tasks_team_id ON public.tasks(team_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

-- Create index on due_date for sorting
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);

-- Update RLS policies to use existing helper functions
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON public.tasks;

-- Recreate policies with updated logic
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

-- Update permissions for tasks table
REVOKE ALL ON public.tasks FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
