-- Create is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Enable RLS on teams table
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for teams table
DROP POLICY IF EXISTS "Teams are viewable by authenticated users" ON teams;
CREATE POLICY "Teams are viewable by authenticated users" ON teams
  FOR SELECT
  TO authenticated
  USING (true);  -- Allow all authenticated users to view teams

DROP POLICY IF EXISTS "Teams are editable by admins" ON teams;
CREATE POLICY "Teams are editable by admins" ON teams
  FOR ALL
  TO authenticated
  USING (is_admin());  -- Only admins can modify teams

-- Verify setup
SELECT * FROM pg_policies WHERE tablename = 'teams';

-- Insert test data if table is empty
INSERT INTO teams (name, leader_id)
SELECT 'Test Team', (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM teams);

-- Show current teams
SELECT * FROM teams;
