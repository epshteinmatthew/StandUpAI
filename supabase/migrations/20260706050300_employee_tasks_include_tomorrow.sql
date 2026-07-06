-- Sync assigns standup tasks for the next 24h with due_date = tomorrow (UTC).
-- Include those on the employee dashboard immediately after sync runs.
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
  and ai.due_date <= current_date + interval '1 day';

comment on view public.employee_today_tasks is
  'Pending action items due today or tomorrow for employee dashboard (covers 24h standup assignments).';
