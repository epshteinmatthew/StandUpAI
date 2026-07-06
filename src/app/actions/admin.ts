'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import type { TeamDeadline } from '@/types/database';
import { inngest } from '@/inngest/client';

export async function updateCompanyGoals(goals: string) {
  const user = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('companies')
    .update({ goals })
    .eq('id', user.company_id);

  if (error) throw new Error(error.message);
  revalidatePath('/admin');
}

export async function updateTeamDeadlines(teamId: string, deadlines: TeamDeadline[]) {
  const user = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('teams')
    .update({ deadlines })
    .eq('id', teamId)
    .eq('company_id', user.company_id);

  if (error) throw new Error(error.message);
  revalidatePath('/admin');
}

export async function triggerTeamSync(teamId: string) {
  await requireAdmin();

  await inngest.send({
    name: 'standupai/sync.team',
    data: { teamId },
  });

  revalidatePath('/admin');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/');
}
