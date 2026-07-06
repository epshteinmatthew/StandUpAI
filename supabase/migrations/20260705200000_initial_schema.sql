-- StandupAI initial schema
-- B2B SaaS: AI agents automate team daily sync meetings

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('admin', 'employee');

create type public.action_item_status as enum ('pending', 'completed');

create type public.action_item_creator as enum ('agent', 'admin');

create type public.meeting_status as enum ('scheduled', 'running', 'completed', 'failed');

-- ---------------------------------------------------------------------------
-- Companies
-- ---------------------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Admin-editable high-level goals (markdown or structured JSON)
  goals text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.companies is 'Top-level tenant; owns teams, users, and meeting history.';
comment on column public.companies.goals is 'Admin-defined company/team goals consumed by daily agent sync.';

-- ---------------------------------------------------------------------------
-- Teams
-- ---------------------------------------------------------------------------
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  -- Admin-editable project deadlines, e.g. [{"project":"API v2","deadline":"2026-08-01"}]
  deadlines jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);

create index teams_company_id_idx on public.teams (company_id);

comment on table public.teams is 'Team within a company; agents run per-team daily syncs.';
comment on column public.teams.deadlines is 'JSON array of {project, deadline, description?} objects.';

-- ---------------------------------------------------------------------------
-- Users (extends Supabase auth.users)
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  team_id uuid references public.teams (id) on delete set null,
  email text not null,
  full_name text not null default '',
  role public.user_role not null default 'employee',
  -- Optional notes surfaced to the employee agent during blocker resolution
  employee_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index users_company_id_idx on public.users (company_id);
create index users_team_id_idx on public.users (team_id);
create index users_role_idx on public.users (role);

comment on table public.users is 'Application profile linked 1:1 with auth.users.';
comment on column public.users.employee_notes is 'Free-text context for agents (blockers, priorities).';

-- ---------------------------------------------------------------------------
-- Agents (1:1 with employee users)
-- ---------------------------------------------------------------------------
create table public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  name text not null default 'Agent',
  avatar_url text,
  system_prompt text not null default '',
  -- Extra structured context: skills, focus areas, tone, etc.
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index agents_user_id_idx on public.agents (user_id);

comment on table public.agents is 'One AI agent per employee; stores prompts and persona context.';

create or replace function public.enforce_agent_employee_role()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.users u
    where u.id = new.user_id and u.role = 'employee'
  ) then
    raise exception 'agents.user_id must reference a user with role employee';
  end if;
  return new;
end;
$$;

create trigger agents_must_be_employee
  before insert or update on public.agents
  for each row execute function public.enforce_agent_employee_role();

-- ---------------------------------------------------------------------------
-- Commit logs (mocked or integrated Git activity)
-- ---------------------------------------------------------------------------
create table public.commits_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  commit_hash text not null,
  message text not null,
  repository text,
  committed_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, commit_hash)
);

create index commits_logs_user_id_idx on public.commits_logs (user_id);
create index commits_logs_committed_at_idx on public.commits_logs (committed_at desc);

comment on table public.commits_logs is 'Recent Git commits used by agents for check-off and blocker detection.';

-- ---------------------------------------------------------------------------
-- Meetings history (daily multi-agent sync runs)
-- ---------------------------------------------------------------------------
create table public.meetings_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  status public.meeting_status not null default 'scheduled',
  -- Full structured transcript: steps, agent turns, decisions
  transcript jsonb not null default '{}'::jsonb,
  summary text not null default '',
  error_message text,
  scheduled_for timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index meetings_history_company_id_idx on public.meetings_history (company_id);
create index meetings_history_team_id_idx on public.meetings_history (team_id);
create index meetings_history_scheduled_for_idx on public.meetings_history (scheduled_for desc);

comment on table public.meetings_history is 'Logs of daily agent sync meetings (transcript + summary).';

-- ---------------------------------------------------------------------------
-- Action items (agent/admin assigned; employees read-only in UI)
-- ---------------------------------------------------------------------------
create table public.action_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  team_id uuid references public.teams (id) on delete set null,
  title text not null,
  description text not null default '',
  assigned_to uuid not null references public.users (id) on delete cascade,
  status public.action_item_status not null default 'pending',
  due_date date not null,
  created_by public.action_item_creator not null,
  -- Set when an agent marks complete during check-off step
  completed_at timestamptz,
  completed_via_commit_id uuid references public.commits_logs (id) on delete set null,
  source_meeting_id uuid references public.meetings_history (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint action_items_completed_consistency check (
    (status = 'pending' and completed_at is null)
    or (status = 'completed' and completed_at is not null)
  )
);

create index action_items_assigned_to_idx on public.action_items (assigned_to);
create index action_items_status_idx on public.action_items (status);
create index action_items_due_date_idx on public.action_items (due_date);
create index action_items_company_id_idx on public.action_items (company_id);
create index action_items_source_meeting_id_idx on public.action_items (source_meeting_id);

comment on table public.action_items is 'Tasks assigned by agents or admins; completion only via agent/commit detection.';

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

create trigger teams_set_updated_at
  before update on public.teams
  for each row execute function public.set_updated_at();

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

create trigger agents_set_updated_at
  before update on public.agents
  for each row execute function public.set_updated_at();

create trigger action_items_set_updated_at
  before update on public.action_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth hook: create public.users row on signup (service role / edge function)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Profile rows are normally created by app invite/onboarding with company_id.
  -- This stub avoids orphan auth users breaking FK expectations.
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Helper: current user's role within their company
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.users
  where id = auth.uid();
$$;

create or replace function public.current_user_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id
  from public.users
  where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.users where id = auth.uid()),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.companies enable row level security;
alter table public.teams enable row level security;
alter table public.users enable row level security;
alter table public.agents enable row level security;
alter table public.commits_logs enable row level security;
alter table public.meetings_history enable row level security;
alter table public.action_items enable row level security;

-- Companies: members read; admins write goals
create policy "company members can read own company"
  on public.companies for select
  using (id = public.current_user_company_id());

create policy "admins can update own company"
  on public.companies for update
  using (id = public.current_user_company_id() and public.is_admin())
  with check (id = public.current_user_company_id() and public.is_admin());

-- Teams
create policy "company members can read teams"
  on public.teams for select
  using (company_id = public.current_user_company_id());

create policy "admins can manage teams"
  on public.teams for all
  using (company_id = public.current_user_company_id() and public.is_admin())
  with check (company_id = public.current_user_company_id() and public.is_admin());

-- Users
create policy "company members can read colleagues"
  on public.users for select
  using (company_id = public.current_user_company_id());

create policy "users can update own profile notes"
  on public.users for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and company_id = public.current_user_company_id()
    -- Employees may only update non-privileged fields via app layer;
    -- DB allows own row update for employee_notes/full_name.
  );

create policy "admins can manage users in company"
  on public.users for all
  using (company_id = public.current_user_company_id() and public.is_admin())
  with check (company_id = public.current_user_company_id() and public.is_admin());

-- Agents: employees read own; admins read all in company
create policy "employees read own agent"
  on public.agents for select
  using (
    user_id = auth.uid()
    or (
      public.is_admin()
      and exists (
        select 1 from public.users u
        where u.id = agents.user_id
          and u.company_id = public.current_user_company_id()
      )
    )
  );

create policy "admins manage agents"
  on public.agents for all
  using (
    public.is_admin()
    and exists (
      select 1 from public.users u
      where u.id = agents.user_id
        and u.company_id = public.current_user_company_id()
    )
  )
  with check (
    public.is_admin()
    and exists (
      select 1 from public.users u
      where u.id = agents.user_id
        and u.company_id = public.current_user_company_id()
    )
  );

-- Commits: employees read own; admins read company
create policy "users read own commits"
  on public.commits_logs for select
  using (
    user_id = auth.uid()
    or (
      public.is_admin()
      and exists (
        select 1 from public.users u
        where u.id = commits_logs.user_id
          and u.company_id = public.current_user_company_id()
      )
    )
  );

create policy "service role manages commits"
  on public.commits_logs for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Meetings: admins read/write; employees read summaries for their team
create policy "company members read meetings"
  on public.meetings_history for select
  using (company_id = public.current_user_company_id());

create policy "admins manage meetings"
  on public.meetings_history for all
  using (company_id = public.current_user_company_id() and public.is_admin())
  with check (company_id = public.current_user_company_id() and public.is_admin());

create policy "service role manages meetings"
  on public.meetings_history for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Action items: employees READ ONLY; admins full access; agents via service role
create policy "employees read own action items"
  on public.action_items for select
  using (
    assigned_to = auth.uid()
    or (
      public.is_admin()
      and company_id = public.current_user_company_id()
    )
  );

-- Explicitly NO insert/update/delete policies for employees (read-only constraint)
create policy "admins manage action items"
  on public.action_items for all
  using (company_id = public.current_user_company_id() and public.is_admin())
  with check (company_id = public.current_user_company_id() and public.is_admin());

create policy "service role manages action items"
  on public.action_items for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
