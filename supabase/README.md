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

### Row Level Security (RLS) Status

**RLS is ENABLED on all tables** (secure by default)
- `profiles`, `teams`, `tasks`, and `messages` all have RLS enabled
- **No RLS policies are defined yet** - This is intentional
- With RLS enabled but no policies, all table access is blocked by default
- This ensures the database is secure from the start

**RLS policies will be added in a separate security-focused branch**
- The next branch will add specific policies to control access
- This separation allows for proper security review and testing

### What's NOT Included (Yet)

The following will be added in separate, focused branches:

- **RLS policies** - Will be added in a security-focused branch
- **Individual task assignment** - Currently tasks are team-based only
- **Analytics tables** - Will be added when analytics features are implemented

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
