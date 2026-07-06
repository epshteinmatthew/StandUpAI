'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireEmployee } from '@/lib/auth/session';

export async function updateEmployeeNotes(notes: string) {
  const user = await requireEmployee();
  const supabase = await createClient();

  const { error } = await supabase
    .from('users')
    .update({ employee_notes: notes })
    .eq('id', user.id);

  if (error) throw new Error(error.message);
  revalidatePath('/dashboard');
}
