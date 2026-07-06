import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { canSetupCompany } from '@/lib/auth/setup';
import { Button } from '@/components/ui/button';
import { withErrorDisplay } from '@/lib/debug/with-error-display';

export default function HomePage() {
  return withErrorDisplay(async () => {
    const user = await getCurrentUser();
    if (user) {
      redirect(user.role === 'admin' ? '/admin' : '/dashboard');
    }

    const showSetup = await canSetupCompany();

    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
        <div className="max-w-xl text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">StandupAI</h1>
          <p className="text-muted-foreground text-lg">
            AI agents run your daily standup — check off tasks from commits, resolve blockers, and
            assign focused work for the next 24 hours.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/login">Sign in</Link>
          </Button>
          {showSetup && (
            <Button asChild size="lg" variant="outline">
              <Link href="/setup">Create organization</Link>
            </Button>
          )}
        </div>
      </main>
    );
  });
}
