/**
 * StandupAI database types — mirrors supabase/migrations schema.
 */

export type UserRole = 'admin' | 'employee';
export type ActionItemStatus = 'pending' | 'completed';
export type ActionItemCreator = 'agent' | 'admin';
export type MeetingStatus = 'scheduled' | 'running' | 'completed' | 'failed';

export interface TeamDeadline {
  project: string;
  deadline: string;
  description?: string;
}

export interface Company {
  id: string;
  name: string;
  goals: string;
  github_webhook_secret?: string | null;
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
  github_username: string | null;
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
  error_message: string | null;
  scheduled_for: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface TeamInvite {
  id: string;
  company_id: string;
  team_id: string | null;
  email: string;
  full_name: string;
  role: UserRole;
  token: string;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

type Tables = {
  companies: {
    Row: Company;
    Insert: {
      id?: string;
      name: string;
      goals?: string;
      github_webhook_secret?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<Omit<Company, 'id'>>;
    Relationships: [];
  };
  teams: {
    Row: Team;
    Insert: {
      id?: string;
      company_id: string;
      name: string;
      deadlines?: TeamDeadline[];
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<Omit<Team, 'id'>>;
    Relationships: [];
  };
  users: {
    Row: User;
    Insert: {
      id: string;
      company_id: string;
      team_id?: string | null;
      email: string;
      full_name?: string;
      role?: UserRole;
      employee_notes?: string;
      github_username?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<Omit<User, 'id'>>;
    Relationships: [];
  };
  agents: {
    Row: Agent;
    Insert: {
      id?: string;
      user_id: string;
      name?: string;
      avatar_url?: string | null;
      system_prompt?: string;
      context?: Record<string, unknown>;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<Omit<Agent, 'id'>>;
    Relationships: [];
  };
  commits_logs: {
    Row: CommitLog;
    Insert: {
      id?: string;
      user_id: string;
      commit_hash: string;
      message: string;
      repository?: string | null;
      committed_at: string;
      created_at?: string;
    };
    Update: Partial<Omit<CommitLog, 'id'>>;
    Relationships: [];
  };
  action_items: {
    Row: ActionItem;
    Insert: {
      id?: string;
      company_id: string;
      team_id?: string | null;
      title: string;
      description?: string;
      assigned_to: string;
      status?: ActionItemStatus;
      due_date: string;
      created_by: ActionItemCreator;
      completed_at?: string | null;
      completed_via_commit_id?: string | null;
      source_meeting_id?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<Omit<ActionItem, 'id'>>;
    Relationships: [];
  };
  meetings_history: {
    Row: MeetingHistory;
    Insert: {
      id?: string;
      company_id: string;
      team_id: string;
      status?: MeetingStatus;
      transcript?: MeetingTranscript;
      summary?: string;
      error_message?: string | null;
      scheduled_for?: string;
      started_at?: string | null;
      completed_at?: string | null;
      created_at?: string;
    };
    Update: Partial<Omit<MeetingHistory, 'id'>>;
    Relationships: [];
  };
  team_invites: {
    Row: TeamInvite;
    Insert: {
      id?: string;
      company_id: string;
      team_id?: string | null;
      email: string;
      full_name?: string;
      role?: UserRole;
      token?: string;
      invited_by: string;
      expires_at?: string;
      accepted_at?: string | null;
      created_at?: string;
    };
    Update: Partial<Omit<TeamInvite, 'id'>>;
    Relationships: [];
  };
};

export type Database = {
  public: {
    Tables: Tables;
    Views: {
      employee_today_tasks: {
        Row: EmployeeTodayTask;
        Relationships: [];
      };
      admin_meeting_logs: {
        Row: AdminMeetingLog;
        Relationships: [];
      };
    };
    Functions: {
      get_agent_sync_context: {
        Args: { p_team_id: string };
        Returns: AgentSyncContext;
      };
      complete_action_item_via_commit: {
        Args: { p_action_item_id: string; p_commit_id: string };
        Returns: ActionItem;
      };
    };
    Enums: {
      user_role: UserRole;
      action_item_status: ActionItemStatus;
      action_item_creator: ActionItemCreator;
      meeting_status: MeetingStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
