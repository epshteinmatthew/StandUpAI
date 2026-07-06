-- RLS hardening: grants + service-role policies for bootstrap/sync paths.
-- Safe to run on projects where RLS was enabled manually in the Supabase dashboard.

-- ---------------------------------------------------------------------------
-- Helper functions used inside RLS policies must be executable by app roles
-- ---------------------------------------------------------------------------
grant execute on function public.current_user_company_id() to authenticated, service_role;
grant execute on function public.current_user_role() to authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;

-- Sync + webhook paths (service role client)
grant execute on function public.get_agent_sync_context(uuid) to service_role;
grant execute on function public.complete_action_item_via_commit(uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Views (security_invoker = true → underlying table RLS still applies)
-- ---------------------------------------------------------------------------
grant select on public.employee_today_tasks to authenticated, service_role;
grant select on public.admin_meeting_logs to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Service role policies (matches commits/meetings/action_items pattern)
-- ---------------------------------------------------------------------------
create policy "service role manages companies"
  on public.companies for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role manages teams"
  on public.teams for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role manages users"
  on public.users for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role manages agents"
  on public.agents for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role manages team invites"
  on public.team_invites for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
