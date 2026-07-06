-- Team member invites (admin-created; accepted via /invite/[token])

create table public.team_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  team_id uuid references public.teams (id) on delete set null,
  email text not null,
  full_name text not null default '',
  role public.user_role not null default 'employee',
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  invited_by uuid not null references public.users (id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index team_invites_company_id_idx on public.team_invites (company_id);
create index team_invites_token_idx on public.team_invites (token);
create unique index team_invites_pending_email_idx
  on public.team_invites (company_id, lower(email))
  where accepted_at is null;

comment on table public.team_invites is 'Pending invitations for employees/admins; accepted via invite link.';

alter table public.team_invites enable row level security;

create policy "admins read company invites"
  on public.team_invites for select
  using (company_id = public.current_user_company_id() and public.is_admin());

create policy "admins create company invites"
  on public.team_invites for insert
  with check (
    company_id = public.current_user_company_id()
    and public.is_admin()
    and invited_by = auth.uid()
  );

create policy "admins delete pending company invites"
  on public.team_invites for delete
  using (
    company_id = public.current_user_company_id()
    and public.is_admin()
    and accepted_at is null
  );

grant select, insert, delete on public.team_invites to authenticated;
grant all on public.team_invites to service_role;
