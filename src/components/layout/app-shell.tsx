import Link from 'next/link';
import { requireUser } from '@/lib/auth/session';
import { signOut } from '@/app/actions/admin';
import { Button } from '@/components/ui/button';

interface AppShellProps {
  children: React.ReactNode;
  title: string;
}

export async function AppShell({ children, title }: AppShellProps) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              StandupAI
            </p>
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user.full_name || user.email}
            </span>
            {user.role === 'admin' ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/admin">Admin</Link>
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            )}
            <form action={signOut}>
              <Button variant="ghost" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
