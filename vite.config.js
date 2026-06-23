-- ============================================================
-- KINLY DATABASE SETUP
-- Run this once in Supabase: Project → SQL Editor → New Query
-- Paste this whole file in and click "Run"
-- ============================================================

-- 1. FAMILY SPACES (one per parent being cared for)
create table family_spaces (
  id uuid primary key default gen_random_uuid(),
  parent_name text not null,
  invite_code text unique not null default substr(md5(random()::text), 1, 8),
  created_at timestamptz default now()
);

-- 2. MEMBERS (links a logged-in user to a family space)
create table members (
  id uuid primary key default gen_random_uuid(),
  family_space_id uuid references family_spaces(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text not null default '#8B6F5C',
  created_at timestamptz default now(),
  unique(family_space_id, user_id)
);

-- 3. TASKS
create table tasks (
  id uuid primary key default gen_random_uuid(),
  family_space_id uuid references family_spaces(id) on delete cascade not null,
  title text not null,
  owner_member_id uuid references members(id) on delete set null,
  due_date date,
  recurring boolean default false,
  done boolean default false,
  created_at timestamptz default now()
);

-- 4. EXPENSES
create table expenses (
  id uuid primary key default gen_random_uuid(),
  family_space_id uuid references family_spaces(id) on delete cascade not null,
  description text not null,
  amount numeric(10,2) not null,
  paid_by_member_id uuid references members(id) on delete set null,
  split_with uuid[] not null default '{}',
  expense_date date default current_date,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Ensures a user can only see/edit data for family spaces they belong to
-- ============================================================

alter table family_spaces enable row level security;
alter table members enable row level security;
alter table tasks enable row level security;
alter table expenses enable row level security;

-- Helper: is this user a member of this family space?
create or replace function is_member_of(space_id uuid)
returns boolean as $$
  select exists (
    select 1 from members
    where family_space_id = space_id and user_id = auth.uid()
  );
$$ language sql security definer;

-- FAMILY SPACES policies
create policy "Members can view their family space"
  on family_spaces for select
  using (is_member_of(id));

create policy "Anyone logged in can create a family space"
  on family_spaces for insert
  with check (auth.uid() is not null);

create policy "Anyone logged in can find a space by invite code to join"
  on family_spaces for select
  using (auth.uid() is not null);

-- MEMBERS policies
create policy "Members can view other members in their space"
  on members for select
  using (is_member_of(family_space_id));

create policy "Users can insert themselves as a member"
  on members for insert
  with check (user_id = auth.uid());

create policy "Members can update their own row"
  on members for update
  using (user_id = auth.uid());

-- TASKS policies
create policy "Members can view tasks in their space"
  on tasks for select
  using (is_member_of(family_space_id));

create policy "Members can insert tasks in their space"
  on tasks for insert
  with check (is_member_of(family_space_id));

create policy "Members can update tasks in their space"
  on tasks for update
  using (is_member_of(family_space_id));

create policy "Members can delete tasks in their space"
  on tasks for delete
  using (is_member_of(family_space_id));

-- EXPENSES policies
create policy "Members can view expenses in their space"
  on expenses for select
  using (is_member_of(family_space_id));

create policy "Members can insert expenses in their space"
  on expenses for insert
  with check (is_member_of(family_space_id));

create policy "Members can update expenses in their space"
  on expenses for update
  using (is_member_of(family_space_id));

create policy "Members can delete expenses in their space"
  on expenses for delete
  using (is_member_of(family_space_id));

-- ============================================================
-- REALTIME (so everyone's screen updates live when someone else
-- adds/changes a task or expense)
-- ============================================================
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table expenses;
alter publication supabase_realtime add table members;

-- Done. You should see 4 new tables in Table Editor: 
-- family_spaces, members, tasks, expenses
