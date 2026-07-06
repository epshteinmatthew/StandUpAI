'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { getAppBaseUrl } from '@/lib/auth/app-url';
import type { TeamInvite, User, UserRole } from '@/types/database';

export type InvitePreview = {
  email: string;
  full_name: string;
  role: UserRole;
  company_name: string;
  team_name: string | null;
  expired: boolean;
  accepted: boolean;
};

export async function listTeamMembers(): Promise<{
  members: Pick<User, 'id' | 'email' | 'full_name' | 'role' | 'team_id' | 'github_username' | 'created_at'>[];
  invites: TeamInvite[];
}> {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { data: members, error: membersError } = await supabase
    .from('users')
    .select('id, email, full_name, role, team_id, github_username, created_at')
    .eq('company_id', admin.company_id)
    .order('created_at', { ascending: true });

  if (membersError) throw new Error(membersError.message);

  const { data: invites, error: invitesError } = await supabase
    .from('team_invites')
    .select('*')
    .eq('company_id', admin.company_id)
    .is('accepted_at', null)
    .order('created_at', { ascending: false });

  if (invitesError) throw new Error(invitesError.message);

  return {
    members: (members ?? []) as Pick<
      User,
      'id' | 'email' | 'full_name' | 'role' | 'team_id' | 'github_username' | 'created_at'
    >[],
    invites: (invites ?? []) as TeamInvite[],
  };
}

export async function createTeamInvite(input: {
  email: string;
  fullName: string;
  teamId: string;
  role?: UserRole;
}) {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  const role = input.role ?? 'employee';
  const teamId = input.teamId;

  if (!email || !fullName || !teamId) {
    throw new Error('Email, name, and team are required.');
  }

  if (role === 'employee' && !teamId) {
    throw new Error('Employees must be assigned to a team.');
  }

  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('company_id', admin.company_id)
    .ilike('email', email)
    .maybeSingle();

  if (existingUser) {
    throw new Error('A user with this email already exists in your company.');
  }

  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('id', teamId)
    .eq('company_id', admin.company_id)
    .single();

  if (!team) {
    throw new Error('Team not found.');
  }

  await supabase
    .from('team_invites')
    .delete()
    .eq('company_id', admin.company_id)
    .ilike('email', email)
    .is('accepted_at', null);

  const { data: invite, error } = await supabase
    .from('team_invites')
    .insert({
      company_id: admin.company_id,
      team_id: teamId,
      email,
      full_name: fullName,
      role,
      invited_by: admin.id,
    })
    .select('token')
    .single();

  if (error || !invite) {
    throw new Error(error?.message ?? 'Failed to create invite');
  }

  const baseUrl = await getAppBaseUrl();
  const inviteUrl = `${baseUrl}/invite/${(invite as { token: string }).token}`;

  revalidatePath('/admin');
  return { inviteUrl };
}

export async function revokeTeamInvite(inviteId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('team_invites')
    .delete()
    .eq('id', inviteId)
    .is('accepted_at', null);

  if (error) throw new Error(error.message);
  revalidatePath('/admin');
}

export async function getInvitePreview(token: string): Promise<InvitePreview | null> {
  const supabase = createAdminClient();

  const { data: invite, error } = await supabase
    .from('team_invites')
    .select('email, full_name, role, expires_at, accepted_at, company_id, team_id')
    .eq('token', token)
    .maybeSingle();

  if (error || !invite) return null;

  const row = invite as {
    email: string;
    full_name: string;
    role: UserRole;
    expires_at: string;
    accepted_at: string | null;
    company_id: string;
    team_id: string | null;
  };

  const [{ data: company }, { data: team }] = await Promise.all([
    supabase.from('companies').select('name').eq('id', row.company_id).maybeSingle(),
    row.team_id
      ? supabase.from('teams').select('name').eq('id', row.team_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    email: row.email,
    full_name: row.full_name,
    role: row.role,
    company_name: (company as { name: string } | null)?.name ?? 'Your company',
    team_name: (team as { name: string } | null)?.name ?? null,
    expired: new Date(row.expires_at) < new Date(),
    accepted: row.accepted_at !== null,
  };
}

export async function acceptTeamInvite(input: {
  token: string;
  fullName: string;
  password: string;
}) {
  const token = input.token.trim();
  const fullName = input.fullName.trim();
  const password = input.password;

  if (!token || !fullName || password.length < 8) {
    throw new Error('Name and password (8+ characters) are required.');
  }

  const supabase = createAdminClient();

  const { data: invite, error: inviteError } = await supabase
    .from('team_invites')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .maybeSingle();

  if (inviteError || !invite) {
    throw new Error('This invite is invalid or has already been used.');
  }

  const inviteRow = invite as TeamInvite;

  if (new Date(inviteRow.expires_at) < new Date()) {
    throw new Error('This invite has expired. Ask your admin for a new one.');
  }

  const email = inviteRow.email.toLowerCase();

  const { data: existingProfile } = await supabase
    .from('users')
    .select('id')
    .ilike('email', email)
    .maybeSingle();

  if (existingProfile) {
    throw new Error('An account with this email already exists. Try signing in instead.');
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authError || !authData.user) {
    throw new Error(authError?.message ?? 'Failed to create account');
  }

  const userId = authData.user.id;

  const { error: profileError } = await supabase.from('users').insert({
    id: userId,
    company_id: inviteRow.company_id,
    team_id: inviteRow.team_id,
    email,
    full_name: fullName,
    role: inviteRow.role,
  });

  if (profileError) {
    await supabase.auth.admin.deleteUser(userId);
    throw new Error(profileError.message);
  }

  if (inviteRow.role === 'employee') {
    const { error: agentError } = await supabase.from('agents').insert({
      user_id: userId,
      name: `${fullName.split(' ')[0]}'s Agent`,
      system_prompt: `You represent ${fullName} in daily standups.`,
      context: {},
    });

    if (agentError) {
      await supabase.from('users').delete().eq('id', userId);
      await supabase.auth.admin.deleteUser(userId);
      throw new Error(agentError.message);
    }
  }

  const { error: acceptError } = await supabase
    .from('team_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', inviteRow.id);

  if (acceptError) {
    throw new Error(acceptError.message);
  }

  return { email, role: inviteRow.role };
}
