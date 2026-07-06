import { createAdminClient } from '@/lib/supabase/admin';

export async function canSetupCompany(): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (error) return false;
    return (count ?? 0) === 0;
  } catch {
    return false;
  }
}
