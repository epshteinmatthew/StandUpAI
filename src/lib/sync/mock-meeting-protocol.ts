import type { AgentSyncContext, AgentTurn, MeetingTranscript } from '@/types/database';

type Completion = {
  action_item_id: string;
  commit_id: string | null;
  reason: string;
};

type NewTask = {
  user_id: string;
  title: string;
  description: string;
  due_date: string;
};

function withTimestamps(turns: Omit<AgentTurn, 'timestamp'>[]): AgentTurn[] {
  const now = Date.now();
  return turns.map((turn, index) => ({
    ...turn,
    timestamp: new Date(now + index * 1000).toISOString(),
  }));
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3);
}

function commitMatchesTask(commitMessage: string, taskTitle: string): boolean {
  const commitTokens = new Set(tokenize(commitMessage));
  return tokenize(taskTitle).some((token) => commitTokens.has(token));
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function runMockMeetingProtocol(context: AgentSyncContext) {
  const completions: Completion[] = [];
  const checkOffTurns: Omit<AgentTurn, 'timestamp'>[] = [];

  for (const agent of context.agents) {
    const completed: string[] = [];
    for (const item of agent.pending_action_items) {
      const matchingCommit = agent.recent_commits.find((c) =>
        commitMatchesTask(c.message, item.title)
      );
      if (matchingCommit) {
        completions.push({
          action_item_id: item.id,
          commit_id: matchingCommit.id,
          reason: `Matched commit "${matchingCommit.commit_hash}" to "${item.title}"`,
        });
        completed.push(item.title);
      }
    }
    checkOffTurns.push({
      agent_id: agent.agent_id,
      user_id: agent.user_id,
      full_name: agent.full_name,
      message:
        completed.length > 0
          ? `Completed ${completed.length} item(s): ${completed.join(', ')}.`
          : 'No pending items matched recent commits yet.',
    });
  }

  const blockerTurns: Omit<AgentTurn, 'timestamp'>[] = [];
  const blockerDecisions: string[] = [];
  for (const agent of context.agents) {
    if (agent.employee_notes.trim()) {
      blockerDecisions.push(`Open blocker: ${agent.full_name} — ${agent.employee_notes}`);
      blockerTurns.push({
        agent_id: agent.agent_id,
        user_id: agent.user_id,
        full_name: agent.full_name,
        message: `Blocker: ${agent.employee_notes}`,
      });
    } else {
      blockerTurns.push({
        agent_id: agent.agent_id,
        user_id: agent.user_id,
        full_name: agent.full_name,
        message: 'No blockers from my side today.',
      });
    }
  }

  const agendaTurns: Omit<AgentTurn, 'timestamp'>[] = [];
  const agendaDecisions: string[] = [];
  const nextDeadline = context.team.deadlines[0];
  for (const agent of context.agents) {
    const pending = agent.pending_action_items[0];
    const focus = pending
      ? `Ship "${pending.title}" aligned with company goals`
      : nextDeadline
        ? `Advance "${nextDeadline.project}" before ${nextDeadline.deadline}`
        : 'Support team goals for the sprint';
    agendaDecisions.push(`${agent.full_name}: ${focus}`);
    agendaTurns.push({
      agent_id: agent.agent_id,
      user_id: agent.user_id,
      full_name: agent.full_name,
      message: `Today's focus: ${focus}.`,
    });
  }

  const due = todayIso();
  const newTasks: NewTask[] = [];
  const taskTurns: Omit<AgentTurn, 'timestamp'>[] = [];
  for (const agent of context.agents) {
    const pending = agent.pending_action_items.find((i) => i.status === 'pending');
    const title = pending
      ? `Finish: ${pending.title}`
      : nextDeadline
        ? `Make progress on ${nextDeadline.project}`
        : 'Complete one measurable deliverable';
    newTasks.push({
      user_id: agent.user_id,
      title,
      description: pending?.description ?? title,
      due_date: due,
    });
    taskTurns.push({
      agent_id: agent.agent_id,
      user_id: agent.user_id,
      full_name: agent.full_name,
      message: `Assigning: "${title}" due ${due}.`,
    });
  }

  const transcript: MeetingTranscript = {
    steps: [
      {
        name: 'check_off',
        agent_turns: withTimestamps(checkOffTurns),
        decisions: completions.map((c) => c.reason),
      },
      {
        name: 'blocker_resolution',
        agent_turns: withTimestamps(blockerTurns),
        decisions: blockerDecisions,
      },
      {
        name: 'agenda_goals',
        agent_turns: withTimestamps(agendaTurns),
        decisions: agendaDecisions,
      },
      {
        name: 'task_assignment',
        agent_turns: withTimestamps(taskTurns),
        decisions: newTasks.map((t) => `${t.title} → ${t.user_id}`),
      },
    ],
  };

  const summary = [
    `Mock sync for ${context.team.name} (LLM unavailable — rule-based fallback).`,
    `${completions.length} task(s) auto-completed from commits.`,
    `${blockerDecisions.length} blocker(s) noted.`,
    `${newTasks.length} new task(s) assigned.`,
  ].join(' ');

  return { transcript, summary, checkOffCompletions: completions, newTasks };
}
