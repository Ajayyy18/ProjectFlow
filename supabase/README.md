# ProjectFlow Database Setup

This directory contains the database schema and migrations for ProjectFlow.

## ⚠️ Important Safety Warnings

- **DO NOT** run these migrations blindly on the existing production database
- **DO NOT** run any SQL against Supabase without a backup
- **DO NOT** use the legacy `.legacy` files - they are kept for reference only
- Live database migration will be planned separately after testing

## Migration Structure

Migrations are stored in `supabase/migrations/` with timestamped filenames for proper ordering.

### Initial Schema

**File:** `supabase/migrations/20260810_initial_schema.sql`

This migration creates the core database structure:

- **profiles** - User profiles linked to Supabase auth
- **teams** - Team management with leader and members
- **tasks** - Task tracking with team assignment
- **messages** - Team messaging system

### Running on a Fresh Test Database

To set up a fresh test database:

1. Open the Supabase SQL Editor for your test project
2. Open `supabase/migrations/20260810_initial_schema.sql`
3. Execute the SQL

This will:
- Enable the UUID extension
- Create all required tables
- Set up triggers for automatic timestamp updates
- Create the auth trigger for new user profile creation
- Enable Row Level Security on all tables (secure by default)

### Database Schema Overview

#### profiles
- `id` - UUID (references auth.users)
- `email` - User email
- `full_name` - User's full name
- `role` - TEXT (restricted to 'admin' or 'student')
- `roll_number` - Student roll number (optional)
- `branch` - Academic branch (optional, restricted values)
- `created_at` - Timestamp
- `updated_at` - Timestamp (auto-updated)

#### teams
- `id` - UUID (primary key)
- `name` - Team name
- `leader_id` - UUID (references profiles)
- `members` - Array of UUIDs (max 4 members)
- `created_at` - Timestamp
- `updated_at` - Timestamp (auto-updated)

#### tasks
- `id` - UUID (primary key)
- `title` - Task title
- `description` - Task description (optional)
- `team_id` - UUID (references teams)
- `deadline` - Task deadline
- `status` - TEXT (restricted to 'pending', 'in_progress', 'completed')
- `completed_at` - Completion timestamp (optional)
- `created_at` - Timestamp
- `updated_at` - Timestamp (auto-updated)

#### messages
- `id` - UUID (primary key)
- `team_id` - UUID (references teams)
- `user_id` - UUID (references profiles)
- `content` - Message content
- `created_at` - Timestamp

### RLS Policies

**File:** `supabase/migrations/20260810_01_rls_policies.sql`

This migration adds Row Level Security policies to control data access based on user roles and team membership.

#### Helper Functions

The migration creates three secure helper functions:

1. **is_admin()** - Checks if the current authenticated user has an admin role in their profile. This function is used throughout the policies to grant admin-only access to all data.

2. **is_team_member(target_team_id)** - Checks if the current authenticated user belongs to a specific team, either as the team leader or as a member listed in the team's members array. This function ensures students can only access their own team's data.

3. **is_same_team_member(target_profile_id)** - Checks if the current authenticated user and a target profile are in the same team. This allows students to see their team members' profiles while keeping other users' profiles private.

#### Policy Concepts

The RLS policies implement four key security concepts:

1. **Profile Privacy** - Regular users can read their own profile and profiles of their team members. Admins can read all profiles. No client-side insert/update/delete operations are allowed (profile creation is handled by the auth trigger, and profile updates should be done through admin functions).

2. **Team-Based Access** - Students can only read teams where they are either the leader or a member. Admins have full read/create/update/delete access to all teams. Students cannot modify team information.

3. **Task Isolation** - Students can only read and update tasks belonging to their own team. Admins have full control over all tasks. Students are restricted to updating only the task status and completion timestamp.

4. **Message Scoping** - Students can only read messages from their own team and can only send messages as themselves (user_id must match their authenticated ID). Admins can read and insert messages into any team. No update or delete operations are allowed for anyone.

#### Running the RLS Migration

After running the initial schema migration on a fresh test database:

1. Open the Supabase SQL Editor for your test project
2. Open `supabase/migrations/20260810_01_rls_policies.sql`
3. Execute the SQL

This will:
- Create the secure helper functions
- Apply RLS policies to all tables
- Set up table-level permissions for the authenticated role
- Set up column-level permissions for task updates
- Restrict helper function execution to authenticated users only
- Ensure the database is properly secured

#### Table and Function Permissions

The migration sets explicit permissions for the `authenticated` role:

**Table Permissions:**
- `profiles`: SELECT only (read access controlled by RLS policies)
- `teams`: SELECT, INSERT, UPDATE, DELETE (write access controlled by RLS policies)
- `tasks`: SELECT, INSERT, DELETE (UPDATE restricted to specific columns)
- `messages`: SELECT, INSERT (no update/delete allowed)

**Column-Level Restrictions:**
- `tasks` table: UPDATE permission restricted to `status` and `completed_at` columns only

**Function Execution:**
- Helper functions (`is_admin`, `is_team_member`, `is_same_team_member`) can only be executed by authenticated users
- Public access to these functions is revoked for security

### Row Level Security (RLS) Status

**RLS is ENABLED on all tables** (secure by default)
- `profiles`, `teams`, `tasks`, and `messages` all have RLS enabled
- **RLS policies are now defined** in the `20260810_01_rls_policies.sql` migration
- These policies enforce role-based access control and team-based data isolation

**⚠️ IMPORTANT: These migration files are for the future test database workflow only**
- Do NOT run these migrations on the existing production database
- Production database migration will be planned separately after thorough testing
- A separate Supabase test project should be created to validate these policies

### What's NOT Included (Yet)

The following will be added in separate, focused branches:

- **Individual task assignment** - Currently tasks are team-based only
- **Analytics tables** - Will be added when analytics features are implemented
- **Admin role assignment mechanism** - Currently all new users are assigned 'student' role; admin promotion mechanism is deferred

### Legacy Files

The following files have been marked as `.legacy` and should NOT be used:

- `schema.sql.legacy` - Old schema with destructive DROP SCHEMA command
- `setup.sql.legacy` - Old setup with hard-coded user IDs and demo accounts

These are kept only for reference during the transition period.

## Next Steps for Production Migration

Before migrating the production database:

1. Test the migration thoroughly on a fresh database
2. Plan data migration strategy for existing production data
3. Create a backup of the production database
4. Review and approve RLS policies in the security branch
5. Schedule a maintenance window for the migration
