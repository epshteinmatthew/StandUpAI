import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { User } from '@/types/database';

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  return profile as User | null;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== 'admin') redirect('/dashboard');
  return user;
}

export async function requireEmployee(): Promise<User> {
  const user = await requireUser();
  if (user.role !== 'employee') redirect('/admin');
  return user;
}
