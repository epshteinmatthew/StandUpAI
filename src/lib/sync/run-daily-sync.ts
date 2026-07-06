import { createAdminClient } from '@/lib/supabase/admin';
import { runMeetingProtocol } from '@/lib/sync/run-meeting';
import type { AgentSyncContext } from '@/types/database';

export async function runDailySyncForTeam(teamId: string) {
  const supabase = createAdminClient();

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id, company_id, name')
    .eq('id', teamId)
    .single();

  const teamRow = team as { id: string; company_id: string; name: string } | null;

  if (teamError || !teamRow) {
    throw new Error(`Team not found: ${teamId}`);
  }

  const { data: meeting, error: meetingError } = await supabase
    .from('meetings_history')
    .insert({
      company_id: teamRow.company_id,
      team_id: teamId,
      status: 'running',
      started_at: new Date().toISOString(),
      scheduled_for: new Date().toISOString(),
      transcript: { steps: [] },
      summary: '',
    })
    .select('id')
    .single();

  const meetingRow = meeting as { id: string } | null;

  if (meetingError || !meetingRow) {
    throw new Error(`Failed to create meeting: ${meetingError?.message}`);
  }

  try {
    const { data: contextData, error: contextError } = await supabase.rpc(
      'get_agent_sync_context',
      { p_team_id: teamId }
    );

    if (contextError || !contextData) {
      throw new Error(`Failed to load sync context: ${contextError?.message}`);
    }

    const context = contextData as AgentSyncContext;

    if (!context.agents?.length) {
      throw new Error(`No employee agents found for team ${teamRow.name}`);
    }

    const result = await runMeetingProtocol(context);

    for (const completion of result.checkOffCompletions) {
      if (!completion.action_item_id || !completion.commit_id) continue;

      await supabase.rpc('complete_action_item_via_commit', {
        p_action_item_id: completion.action_item_id,
        p_commit_id: completion.commit_id,
      });
    }

    if (result.newTasks.length) {
      const rows = result.newTasks.map((task) => ({
        company_id: teamRow.company_id,
        team_id: teamId,
        title: task.title,
        description: task.description,
        assigned_to: task.user_id,
        due_date: task.due_date,
        created_by: 'agent' as const,
        source_meeting_id: meetingRow.id,
        status: 'pending' as const,
      }));

      const { error: tasksError } = await supabase.from('action_items').insert(rows);
      if (tasksError) throw new Error(`Failed to insert tasks: ${tasksError.message}`);
    }

    const { error: updateError } = await supabase
      .from('meetings_history')
      .update({
        status: 'completed',
        transcript: result.transcript,
        summary: result.summary,
        completed_at: new Date().toISOString(),
      })
      .eq('id', meetingRow.id);

    if (updateError) throw new Error(`Failed to finalize meeting: ${updateError.message}`);

    return { meetingId: meetingRow.id, summary: result.summary };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown sync error';

    await supabase
      .from('meetings_history')
      .update({
        status: 'failed',
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', meetingRow.id);

    throw error;
  }
}

export async function runDailySyncForAllTeams() {
  const supabase = createAdminClient();

  const { data: teams, error } = await supabase.from('teams').select('id, name');

  if (error) throw new Error(`Failed to list teams: ${error.message}`);

  const results = [];

  for (const team of (teams ?? []) as { id: string; name: string }[]) {
    const result = await runDailySyncForTeam(team.id);
    results.push({ teamId: team.id, teamName: team.name, ...result });
  }

  return results;
}
