import { inngest } from '@/inngest/client';
import { runDailySyncForAllTeams, runDailySyncForTeam } from '@/lib/sync/run-daily-sync';

export const dailyAgentSync = inngest.createFunction(
  {
    id: 'daily-agent-sync',
    name: 'Daily Agent Sync',
    triggers: [{ cron: '0 9 * * *' }],
  },
  async ({ step }) => {
    const results = await step.run('run-all-team-syncs', () => runDailySyncForAllTeams());
    return { teamsProcessed: results.length, results };
  }
);

export const manualTeamSync = inngest.createFunction(
  {
    id: 'manual-team-sync',
    name: 'Manual Team Sync',
    retries: 0,
    triggers: [{ event: 'standupai/sync.team' }],
  },
  async ({ event, step }) => {
    const teamId = event.data.teamId as string;
    const result = await step.run('run-team-sync', () => runDailySyncForTeam(teamId));
    return result;
  }
);

export const inngestFunctions = [dailyAgentSync, manualTeamSync];
