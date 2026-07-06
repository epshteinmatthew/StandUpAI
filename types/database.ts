/**
 * StandupAI database types — mirrors supabase/migrations schema.
 * Regenerate from Supabase CLI after migrations: `supabase gen types typescript`
 */

export type UserRole = 'admin' | 'employee';
export type ActionItemStatus = 'pending' | 'completed';
export type ActionItemCreator = 'agent' | 'admin';
export type MeetingStatus = 'scheduled' | 'running' | 'completed' | 'failed';

export interface TeamDeadline {
  project: string;
  deadline: string; // ISO date
  description?: string;
}

export interface Company {
  id: string;
  name: string;
  goals: string;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  company_id: string;
  name: string;
  deadlines: TeamDeadline[];
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  company_id: string;
  team_id: string | null;
  email: string;
  full_name: string;
  role: UserRole;
  employee_notes: string;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  system_prompt: string;
  context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CommitLog {
  id: string;
  user_id: string;
  commit_hash: string;
  message: string;
  repository: string | null;
  committed_at: string;
  created_at: string;
}

export interface ActionItem {
  id: string;
  company_id: string;
  team_id: string | null;
  title: string;
  description: string;
  assigned_to: string;
  status: ActionItemStatus;
  due_date: string;
  created_by: ActionItemCreator;
  completed_at: string | null;
  completed_via_commit_id: string | null;
  source_meeting_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Structured meeting transcript stored as JSONB */
export interface MeetingTranscript {
  steps: MeetingStep[];
}

export interface MeetingStep {
  name: 'check_off' | 'blocker_resolution' | 'agenda_goals' | 'task_assignment';
  agent_turns: AgentTurn[];
  decisions?: string[];
}

export interface AgentTurn {
  agent_id: string;
  user_id: string;
  full_name: string;
  message: string;
  timestamp: string;
}

export interface MeetingHistory {
  id: string;
  company_id: string;
  team_id: string;
  status: MeetingStatus;
  transcript: MeetingTranscript;
  summary: string;
  error_message: string | null;
  scheduled_for: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

/** Payload returned by get_agent_sync_context(team_id) */
export interface AgentSyncContext {
  team: Pick<Team, 'id' | 'name' | 'deadlines'>;
  company: Pick<Company, 'id' | 'name' | 'goals'>;
  agents: AgentSyncAgentBundle[];
}

export interface AgentSyncAgentBundle {
  agent_id: string;
  user_id: string;
  full_name: string;
  employee_notes: string;
  system_prompt: string;
  context: Record<string, unknown>;
  recent_commits: Pick<CommitLog, 'id' | 'commit_hash' | 'message' | 'committed_at'>[];
  pending_action_items: Pick<
    ActionItem,
    'id' | 'title' | 'description' | 'due_date' | 'status'
  >[];
}

export interface EmployeeTodayTask {
  id: string;
  title: string;
  description: string;
  status: ActionItemStatus;
  due_date: string;
  created_by: ActionItemCreator;
  created_at: string;
  assigned_to: string;
  agent_name: string;
  agent_avatar_url: string | null;
}

export interface AdminMeetingLog {
  id: string;
  company_id: string;
  team_id: string;
  team_name: string;
  status: MeetingStatus;
  summary: string;
  transcript: MeetingTranscript;
  scheduled_for: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      companies: { Row: Company; Insert: Omit<Company, 'id' | 'created_at' | 'updated_at'> & { id?: string }; Update: Partial<Company> };
      teams: { Row: Team; Insert: Omit<Team, 'id' | 'created_at' | 'updated_at'> & { id?: string }; Update: Partial<Team> };
      users: { Row: User; Insert: Omit<User, 'created_at' | 'updated_at'>; Update: Partial<User> };
      agents: { Row: Agent; Insert: Omit<Agent, 'id' | 'created_at' | 'updated_at'> & { id?: string }; Update: Partial<Agent> };
      commits_logs: { Row: CommitLog; Insert: Omit<CommitLog, 'id' | 'created_at'> & { id?: string }; Update: Partial<CommitLog> };
      action_items: { Row: ActionItem; Insert: Omit<ActionItem, 'id' | 'created_at' | 'updated_at'> & { id?: string }; Update: Partial<ActionItem> };
      meetings_history: { Row: MeetingHistory; Insert: Omit<MeetingHistory, 'id' | 'created_at'> & { id?: string }; Update: Partial<MeetingHistory> };
    };
    Views: {
      employee_today_tasks: { Row: EmployeeTodayTask };
      admin_meeting_logs: { Row: AdminMeetingLog };
    };
    Functions: {
      get_agent_sync_context: { Args: { p_team_id: string }; Returns: AgentSyncContext };
      complete_action_item_via_commit: {
        Args: { p_action_item_id: string; p_commit_id: string };
        Returns: ActionItem;
      };
    };
  };
}
