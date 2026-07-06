import { redirect } from 'next/navigation';
import Link from 'next/link';
import { canSetupCompany } from '@/lib/auth/setup';
import { SetupForm } from '@/components/setup/setup-form';
import { Button } from '@/components/ui/button';

export default async function SetupPage() {
  const allowed = await canSetupCompany();
  if (!allowed) redirect('/login');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <SetupForm />
      <Button asChild variant="ghost">
        <Link href="/login">Already have an account? Sign in</Link>
      </Button>
    </main>
  );
}
