-- Reset database by dropping-- Reset database
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing constraint if it exists
ALTER TABLE IF EXISTS profiles DROP CONSTRAINT IF EXISTS profiles_branch_check;

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'student')) DEFAULT 'student',
  roll_number TEXT,
  branch TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add branch constraint
ALTER TABLE profiles ADD CONSTRAINT profiles_branch_check 
  CHECK (branch IS NULL OR branch IN ('CSM', 'CSE', 'CSC', 'CSD', 'MECH', 'CIVIL', 'EEE', 'IT', 'CSIT'));

-- Create handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, roll_number, branch)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NEW.raw_user_meta_data->>'roll_number',
    NEW.raw_user_meta_data->>'branch'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create teams table
CREATE TABLE teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  leader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  members UUID[] NOT NULL CHECK (array_length(members, 1) <= 4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT members_are_valid FOREIGN KEY (leader_id) REFERENCES profiles(id)
);

-- Create tasks table
create table tasks (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  team_id uuid references teams(id) on delete cascade not null,
  assigned_to uuid references profiles(id) on delete cascade,
  deadline timestamptz not null,
  status text not null check (status in ('pending', 'completed')) default 'pending',
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create messages table
create table messages (
  id uuid default uuid_generate_v4() primary key,
  team_id uuid references teams(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table profiles enable row level security;
alter table teams enable row level security;
alter table tasks enable row level security;
alter table messages enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone"
  on profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

create policy "Users can insert their own profile"
  on profiles for insert
  with check ( auth.uid() = id );

-- Teams policies
create policy "Teams are viewable by everyone"
  on teams for select
  to authenticated
  using (true);

create policy "Only admin can create teams"
  on teams for insert
  to authenticated
  using (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  ));

create policy "Only admin can update teams"
  on teams for update
  to authenticated
  using (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  ));

-- Add triggers for updated_at
drop trigger if exists handle_updated_at on profiles;
drop trigger if exists handle_updated_at on teams;
drop trigger if exists handle_updated_at on tasks;

create trigger handle_updated_at
  before update on profiles
  for each row
  execute procedure handle_updated_at();

create trigger handle_updated_at
  before update on teams
  for each row
  execute procedure handle_updated_at();

create trigger handle_updated_at
  before update on tasks
  for each row
  execute procedure handle_updated_at();
