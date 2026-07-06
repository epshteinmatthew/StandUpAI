'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isMissingTable = error.message.includes('team_invites');

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          {isMissingTable
            ? 'Database migration missing. Run: npx supabase migration up'
            : error.message || 'An unexpected error occurred.'}
        </p>
        <div className="flex justify-center gap-2">
          <Button onClick={() => reset()}>Try again</Button>
          <Button variant="outline" onClick={() => window.location.assign('/')}>
            Home
          </Button>
        </div>
      </div>
    </main>
  );
}
