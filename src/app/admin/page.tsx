import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/app-shell';
import { GoalsEditor } from '@/components/admin/goals-editor';
import { DeadlinesEditor } from '@/components/admin/deadlines-editor';
import { MeetingLogsPanel } from '@/components/admin/meeting-logs-panel';
import { TeamPanel } from '@/components/admin/team-panel';
import { GithubIntegrationPanel } from '@/components/admin/github-integration-panel';
import { AdminTabs, isAdminTab, type AdminTab } from '@/components/admin/admin-tabs';
import { listTeamMembers } from '@/app/actions/invites';
import { getGithubIntegration } from '@/app/actions/github';
import { withErrorDisplay } from '@/lib/debug/with-error-display';
import type { AdminMeetingLog, Company, Team } from '@/types/database';

interface AdminPageProps {
  searchParams?: { tab?: string };
}

export default function AdminPage({ searchParams }: AdminPageProps) {
  return withErrorDisplay(async () => {
    const user = await requireAdmin();
    const supabase = await createClient();

    const { data: company } = await supabase
      .from('companies')
      .select('goals')
      .eq('id', user.company_id)
      .single();

    const { data: teams } = await supabase
      .from('teams')
      .select('id, name, deadlines')
      .eq('company_id', user.company_id)
      .order('name');

    const { data: meetingsRaw } = await supabase
      .from('meetings_history')
      .select(
        'id, company_id, team_id, status, summary, transcript, error_message, scheduled_for, started_at, completed_at, created_at, teams(name)'
      )
      .eq('company_id', user.company_id)
      .order('scheduled_for', { ascending: false })
      .limit(20);

    const meetings: AdminMeetingLog[] = (meetingsRaw ?? []).map((m) => {
      const row = m as {
        id: string;
        company_id: string;
        team_id: string;
        status: AdminMeetingLog['status'];
        summary: string;
        transcript: AdminMeetingLog['transcript'];
        error_message: string | null;
        scheduled_for: string;
        started_at: string | null;
        completed_at: string | null;
        created_at: string;
        teams: { name: string } | { name: string }[] | null;
      };
      const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;
      return {
        id: row.id,
        company_id: row.company_id,
        team_id: row.team_id,
        team_name: team?.name ?? 'Team',
        status: row.status,
        summary: row.summary,
        transcript: row.transcript,
        error_message: row.error_message,
        scheduled_for: row.scheduled_for,
        started_at: row.started_at,
        completed_at: row.completed_at,
        created_at: row.created_at,
      };
    });

    if (!company) redirect('/login');

    const companyData = company as Pick<Company, 'goals'>;
    const teamData = (teams ?? []) as Pick<Team, 'id' | 'name' | 'deadlines'>[];
    const { members, invites } = await listTeamMembers();
    const githubIntegration = await getGithubIntegration();
    const tabParam = searchParams?.tab;
    const initialTab: AdminTab = isAdminTab(tabParam) ? tabParam : 'goals';

    return (
      <AppShell title="Admin dashboard">
        <AdminTabs
          initialTab={initialTab}
          goals={
            <>
              <GoalsEditor initialGoals={companyData.goals} />
              <DeadlinesEditor teams={teamData} />
            </>
          }
          team={
            <TeamPanel
              teams={teamData.map((t) => ({ id: t.id, name: t.name }))}
              members={members}
              invites={invites}
            />
          }
          integrations={
            <GithubIntegrationPanel
              integration={githubIntegration}
              members={members.map((m) => ({
                id: m.id,
                full_name: m.full_name,
                email: m.email,
                github_username: m.github_username,
              }))}
            />
          }
          meetings={
            <MeetingLogsPanel
              meetings={meetings}
              teams={teamData.map((t) => ({ id: t.id, name: t.name }))}
            />
          }
        />
      </AppShell>
    );
  });
}
