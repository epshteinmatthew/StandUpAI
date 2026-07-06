import { generateObject } from 'ai';
import { mistral } from '@ai-sdk/mistral';
import { z } from 'zod';
import type {
  AgentSyncAgentBundle,
  AgentSyncContext,
  AgentTurn,
  MeetingStep,
  MeetingTranscript,
} from '@/types/database';

const model = mistral(process.env.MISTRAL_MODEL ?? 'mistral-small-latest');

const checkOffSchema = z.object({
  completions: z.array(
    z.object({
      action_item_id: z.string(),
      commit_id: z.string().nullable(),
      reason: z.string(),
    })
  ),
  agent_turns: z.array(
    z.object({
      agent_id: z.string(),
      user_id: z.string(),
      full_name: z.string(),
      message: z.string(),
    })
  ),
});

const blockerSchema = z.object({
  blockers: z.array(
    z.object({
      user_id: z.string(),
      description: z.string(),
      resolved: z.boolean(),
      resolution: z.string().nullish(),
    })
  ),
  agent_turns: z.array(
    z.object({
      agent_id: z.string(),
      user_id: z.string(),
      full_name: z.string(),
      message: z.string(),
    })
  ),
});

const agendaSchema = z.object({
  alignments: z.array(
    z.object({
      user_id: z.string(),
      focus: z.string(),
      risk: z.string().nullish(),
    })
  ),
  agent_turns: z.array(
    z.object({
      agent_id: z.string(),
      user_id: z.string(),
      full_name: z.string(),
      message: z.string(),
    })
  ),
});

const taskAssignmentSchema = z.object({
  new_tasks: z.array(
    z.object({
      user_id: z.string(),
      title: z.string(),
      description: z.string(),
      due_date: z.string().describe('ISO date YYYY-MM-DD, within next 24 hours'),
    })
  ),
  agent_turns: z.array(
    z.object({
      agent_id: z.string(),
      user_id: z.string(),
      full_name: z.string(),
      message: z.string(),
    })
  ),
});

function withTimestamps(turns: Omit<AgentTurn, 'timestamp'>[]): AgentTurn[] {
  const now = Date.now();
  return turns.map((turn, index) => ({
    ...turn,
    timestamp: new Date(now + index * 1000).toISOString(),
  }));
}

function formatAgentContext(agent: AgentSyncAgentBundle): string {
  return JSON.stringify(
    {
      full_name: agent.full_name,
      employee_notes: agent.employee_notes,
      recent_commits: agent.recent_commits,
      pending_action_items: agent.pending_action_items,
    },
    null,
    2
  );
}

export interface SyncStepResult {
  step: MeetingStep;
  checkOffCompletions?: z.infer<typeof checkOffSchema>['completions'];
  newTasks?: z.infer<typeof taskAssignmentSchema>['new_tasks'];
}

export async function runCheckOffStep(context: AgentSyncContext): Promise<SyncStepResult> {
  const { object } = await generateObject({
    model,
    schema: checkOffSchema,
    prompt: `You are orchestrating Step 1 (Check-off) of a daily standup for team "${context.team.name}".

Company goals:
${context.company.goals}

For each employee agent, cross-reference their recent commits with pending action items.
Mark items as completed ONLY when commit messages clearly indicate the work was done.
Each agent should briefly announce what was completed and why.

Team context:
${context.agents.map((a) => `Agent ${a.full_name} (${a.agent_id}):\n${formatAgentContext(a)}`).join('\n\n')}`,
  });

  return {
    step: {
      name: 'check_off',
      agent_turns: withTimestamps(object.agent_turns),
      decisions: object.completions.map((c) => c.reason),
    },
    checkOffCompletions: object.completions,
  };
}

export async function runBlockerStep(context: AgentSyncContext): Promise<SyncStepResult> {
  const { object } = await generateObject({
    model,
    schema: blockerSchema,
    prompt: `Step 2 (Blocker Resolution) for team "${context.team.name}".

Identify blockers from: commit gaps (no recent activity), explicit employee_notes, or stalled tasks.
Agents should discuss with each other to propose resolutions. Simulate a concise multi-agent dialogue.

Company goals: ${context.company.goals}

Agents:
${context.agents.map((a) => formatAgentContext(a)).join('\n\n')}`,
  });

  return {
    step: {
      name: 'blocker_resolution',
      agent_turns: withTimestamps(object.agent_turns),
      decisions: object.blockers.map((b) =>
        b.resolved ? `Resolved: ${b.description} — ${b.resolution}` : `Open blocker: ${b.description}`
      ),
    },
  };
}

export async function runAgendaStep(context: AgentSyncContext): Promise<SyncStepResult> {
  const { object } = await generateObject({
    model,
    schema: agendaSchema,
    prompt: `Step 3 (Agenda & Goals) for team "${context.team.name}".

Align daily progress with company goals and team deadlines:
${JSON.stringify(context.team.deadlines, null, 2)}

Each agent states their focus for today relative to goals/deadlines.

Company goals: ${context.company.goals}`,
  });

  return {
    step: {
      name: 'agenda_goals',
      agent_turns: withTimestamps(object.agent_turns),
      decisions: object.alignments.map((a) => {
        const agent = context.agents.find((x) => x.user_id === a.user_id);
        return `${agent?.full_name ?? a.user_id}: ${a.focus}`;
      }),
    },
  };
}

export async function runTaskAssignmentStep(context: AgentSyncContext): Promise<SyncStepResult> {
  const defaultDue = todayIso();

  const { object } = await generateObject({
    model,
    schema: taskAssignmentSchema,
    prompt: `Step 4 (Task Assignment) for team "${context.team.name}".

Collectively generate strict, actionable tasks for the next 24 hours for each employee.
Tasks must be specific, measurable, and assigned to one user_id from the team.
Use due_date ${defaultDue} (end of today) unless a team deadline requires an earlier date.

Valid user IDs: ${context.agents.map((a) => `${a.full_name}=${a.user_id}`).join(', ')}

Company goals: ${context.company.goals}
Team deadlines: ${JSON.stringify(context.team.deadlines)}`,
  });

  return {
    step: {
      name: 'task_assignment',
      agent_turns: withTimestamps(object.agent_turns),
      decisions: object.new_tasks.map((t) => `${t.title} → ${t.user_id}`),
    },
    newTasks: object.new_tasks,
  };
}

const fullMeetingSchema = z.object({
  check_off: checkOffSchema,
  blocker_resolution: blockerSchema,
  agenda_goals: agendaSchema,
  task_assignment: taskAssignmentSchema,
  summary: z.string(),
});

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildMeetingPrompt(context: AgentSyncContext, defaultDue: string): string {
  return `Run a complete daily multi-agent standup for team "${context.team.name}" in four steps.

Company goals:
${context.company.goals}

Team deadlines:
${JSON.stringify(context.team.deadlines, null, 2)}

Default task due_date: ${defaultDue} (use this date so tasks appear on employee dashboards today)

Use EXACT ids from this team context (action_item id, commit id, agent_id, user_id):
${context.agents.map((a) => `Agent ${a.full_name} (agent_id=${a.agent_id}, user_id=${a.user_id}):\n${formatAgentContext(a)}`).join('\n\n')}

Steps to produce:
1. check_off — cross-reference commits vs pending tasks; only complete when commit message proves work done
2. blocker_resolution — identify blockers from notes, commit gaps, stalled tasks; agents discuss resolutions
3. agenda_goals — align today's focus with company goals and deadlines
4. task_assignment — assign specific new tasks for next 24h to valid user_ids above
5. summary — 3-5 sentence admin summary of the meeting`;
}

export async function runFullMeetingProtocol(
  context: AgentSyncContext
): Promise<{
  transcript: MeetingTranscript;
  summary: string;
  checkOffCompletions: z.infer<typeof checkOffSchema>['completions'];
  newTasks: z.infer<typeof taskAssignmentSchema>['new_tasks'];
}> {
  const defaultDue = todayIso();

  // Single API call — keeps per-sync cost low on free tiers
  const { object } = await generateObject({
    model,
    schema: fullMeetingSchema,
    prompt: buildMeetingPrompt(context, defaultDue),
  });

  const checkOffStep: MeetingStep = {
    name: 'check_off',
    agent_turns: withTimestamps(object.check_off.agent_turns),
    decisions: object.check_off.completions.map((c) => c.reason),
  };

  const blockerStep: MeetingStep = {
    name: 'blocker_resolution',
    agent_turns: withTimestamps(object.blocker_resolution.agent_turns),
    decisions: object.blocker_resolution.blockers.map((b) =>
      b.resolved ? `Resolved: ${b.description} — ${b.resolution}` : `Open blocker: ${b.description}`
    ),
  };

  const agendaStep: MeetingStep = {
    name: 'agenda_goals',
    agent_turns: withTimestamps(object.agenda_goals.agent_turns),
    decisions: object.agenda_goals.alignments.map((a) => {
      const agent = context.agents.find((x) => x.user_id === a.user_id);
      return `${agent?.full_name ?? a.user_id}: ${a.focus}`;
    }),
  };

  const taskStep: MeetingStep = {
    name: 'task_assignment',
    agent_turns: withTimestamps(object.task_assignment.agent_turns),
    decisions: object.task_assignment.new_tasks.map((t) => `${t.title} → ${t.user_id}`),
  };

  const transcript: MeetingTranscript = {
    steps: [checkOffStep, blockerStep, agendaStep, taskStep],
  };

  return {
    transcript,
    summary: object.summary,
    checkOffCompletions: object.check_off.completions,
    newTasks: object.task_assignment.new_tasks,
  };
}
