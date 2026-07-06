-- Supporting views and RPC helpers for dashboards and daily sync

-- ---------------------------------------------------------------------------
-- Employee dashboard: today's tasks (read-only source for UI)
-- ---------------------------------------------------------------------------
create or replace view public.employee_today_tasks
with (security_invoker = true)
as
select
  ai.id,
  ai.title,
  ai.description,
  ai.status,
  ai.due_date,
  ai.created_by,
  ai.created_at,
  ai.assigned_to,
  a.name as agent_name,
  a.avatar_url as agent_avatar_url
from public.action_items ai
join public.agents a on a.user_id = ai.assigned_to
where ai.status = 'pending'
  and ai.due_date <= current_date;

comment on view public.employee_today_tasks is 'Pending action items due today or earlier for employee dashboard.';

-- ---------------------------------------------------------------------------
-- Admin dashboard: recent meeting logs
-- ---------------------------------------------------------------------------
create or replace view public.admin_meeting_logs
with (security_invoker = true)
as
select
  mh.id,
  mh.company_id,
  mh.team_id,
  t.name as team_name,
  mh.status,
  mh.summary,
  mh.transcript,
  mh.scheduled_for,
  mh.started_at,
  mh.completed_at,
  mh.created_at
from public.meetings_history mh
join public.teams t on t.id = mh.team_id
order by mh.scheduled_for desc;

comment on view public.admin_meeting_logs is 'Meeting history with team names for admin Meeting Logs tab.';

-- ---------------------------------------------------------------------------
-- RPC: fetch agent context bundle for daily sync (service role / edge fn)
-- ---------------------------------------------------------------------------
create or replace function public.get_agent_sync_context(p_team_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'team', (
      select jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'deadlines', t.deadlines
      )
      from public.teams t
      where t.id = p_team_id
    ),
    'company', (
      select jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'goals', c.goals
      )
      from public.companies c
      join public.teams t on t.company_id = c.id
      where t.id = p_team_id
    ),
    'agents', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'agent_id', a.id,
          'user_id', u.id,
          'full_name', u.full_name,
          'employee_notes', u.employee_notes,
          'system_prompt', a.system_prompt,
          'context', a.context,
          'recent_commits', (
            select coalesce(jsonb_agg(
              jsonb_build_object(
                'id', cl.id,
                'commit_hash', cl.commit_hash,
                'message', cl.message,
                'committed_at', cl.committed_at
              )
              order by cl.committed_at desc
            ), '[]'::jsonb)
            from (
              select cl.*
              from public.commits_logs cl
              where cl.user_id = u.id
              order by cl.committed_at desc
              limit 20
            ) cl
          ),
          'pending_action_items', (
            select coalesce(jsonb_agg(
              jsonb_build_object(
                'id', ai.id,
                'title', ai.title,
                'description', ai.description,
                'due_date', ai.due_date,
                'status', ai.status
              )
              order by ai.due_date asc
            ), '[]'::jsonb)
            from public.action_items ai
            where ai.assigned_to = u.id
              and ai.status = 'pending'
          )
        )
      )
      from public.users u
      join public.agents a on a.user_id = u.id
      where u.team_id = p_team_id
        and u.role = 'employee'
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

comment on function public.get_agent_sync_context is 'Bundles team goals, commits, and pending tasks for the daily multi-agent sync.';

-- ---------------------------------------------------------------------------
-- RPC: mark action item completed via commit (Step 1 check-off)
-- ---------------------------------------------------------------------------
create or replace function public.complete_action_item_via_commit(
  p_action_item_id uuid,
  p_commit_id uuid
)
returns public.action_items
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row public.action_items;
begin
  update public.action_items
  set
    status = 'completed',
    completed_at = now(),
    completed_via_commit_id = p_commit_id,
    updated_at = now()
  where id = p_action_item_id
    and status = 'pending'
  returning * into updated_row;

  return updated_row;
end;
$$;
