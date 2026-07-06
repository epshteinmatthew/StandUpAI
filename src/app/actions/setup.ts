'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { canSetupCompany } from '@/lib/auth/setup';

export async function setupCompany(input: {
  companyName: string;
  teamName: string;
  adminEmail: string;
  adminFullName: string;
  adminPassword: string;
}) {
  const allowed = await canSetupCompany();
  if (!allowed) {
    throw new Error('Setup is disabled — an account already exists.');
  }

  const companyName = input.companyName.trim();
  const teamName = input.teamName.trim();
  const email = input.adminEmail.trim().toLowerCase();
  const fullName = input.adminFullName.trim();
  const password = input.adminPassword;

  if (!companyName || !teamName || !email || !fullName || password.length < 8) {
    throw new Error('Fill in all fields. Password must be at least 8 characters.');
  }

  const supabase = createAdminClient();

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({ name: companyName, goals: '' })
    .select('id')
    .single();

  if (companyError || !company) {
    throw new Error(companyError?.message ?? 'Failed to create company');
  }

  const companyId = (company as { id: string }).id;

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({ company_id: companyId, name: teamName, deadlines: [] })
    .select('id')
    .single();

  if (teamError || !team) {
    throw new Error(teamError?.message ?? 'Failed to create team');
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authError || !authData.user) {
    throw new Error(authError?.message ?? 'Failed to create admin account');
  }

  const { error: profileError } = await supabase.from('users').insert({
    id: authData.user.id,
    company_id: companyId,
    team_id: (team as { id: string }).id,
    email,
    full_name: fullName,
    role: 'admin',
  });

  if (profileError) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw new Error(profileError.message);
  }

  return { email };
}
