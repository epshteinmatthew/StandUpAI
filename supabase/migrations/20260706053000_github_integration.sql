-- GitHub webhook integration: map commits to employees via github_username

alter table public.companies
  add column if not exists github_webhook_secret text;

comment on column public.companies.github_webhook_secret is
  'HMAC secret for verifying GitHub webhook signatures (X-Hub-Signature-256).';

alter table public.users
  add column if not exists github_username text;

comment on column public.users.github_username is
  'GitHub login used to attribute push commits to this user.';

create unique index if not exists users_company_github_username_idx
  on public.users (company_id, lower(github_username))
  where github_username is not null;

create policy "admins update colleague github username"
  on public.users for update
  using (company_id = public.current_user_company_id() and public.is_admin())
  with check (company_id = public.current_user_company_id() and public.is_admin());
