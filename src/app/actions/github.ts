'use server';

import { randomBytes } from 'crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { getAppBaseUrl } from '@/lib/auth/app-url';

export async function getGithubIntegration() {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('companies')
    .select('id, github_webhook_secret')
    .eq('id', admin.company_id)
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Company not found');

  const row = data as { id: string; github_webhook_secret: string | null };
  const baseUrl = await getAppBaseUrl();

  return {
    companyId: row.id,
    webhookUrl: `${baseUrl}/api/webhooks/github/${row.id}`,
    hasSecret: Boolean(row.github_webhook_secret),
  };
}

export async function rotateGithubWebhookSecret() {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const secret = randomBytes(32).toString('hex');

  const { error } = await supabase
    .from('companies')
    .update({ github_webhook_secret: secret })
    .eq('id', admin.company_id);

  if (error) throw new Error(error.message);

  revalidatePath('/admin');
  return { secret };
}

export async function updateUserGithubUsername(userId: string, githubUsername: string) {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const normalized = githubUsername.trim().replace(/^@/, '').toLowerCase();

  const { error } = await supabase
    .from('users')
    .update({ github_username: normalized || null })
    .eq('id', userId)
    .eq('company_id', admin.company_id);

  if (error) throw new Error(error.message);
  revalidatePath('/admin');
}
