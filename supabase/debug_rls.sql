-- Drop existing policies
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Teams are viewable by authenticated users" ON teams;
DROP POLICY IF EXISTS "Tasks are viewable by team members" ON tasks;

-- Create debug policies that allow all authenticated users to view data
CREATE POLICY "Debug - Allow all reads for authenticated users"
    ON profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Debug - Allow all reads for authenticated users"
    ON teams FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Debug - Allow all reads for authenticated users"
    ON tasks FOR SELECT
    TO authenticated
    USING (true);

-- Test query to check data
SELECT 
    t.id as team_id,
    t.name as team_name,
    t.leader_id,
    p.full_name as leader_name,
    p.role as leader_role,
    COUNT(tk.id) as task_count
FROM teams t
LEFT JOIN profiles p ON t.leader_id = p.id
LEFT JOIN tasks tk ON tk.team_id = t.id
GROUP BY t.id, t.name, t.leader_id, p.full_name, p.role;
