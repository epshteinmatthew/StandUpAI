'use client';

import { useEffect } from 'react';
import { formatErrorForDisplay, serializeError } from '@/lib/debug/errors';
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

  const details = formatErrorForDisplay(serializeError(error));
  const isMissingTable = error.message.includes('team_invites');

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-3xl space-y-4">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        {isMissingTable ? (
          <p className="text-sm text-muted-foreground">
            Database migration missing. Run: npx supabase migration up
          </p>
        ) : null}
        <pre className="max-h-[70vh] overflow-auto rounded-md border bg-muted p-4 text-left text-xs whitespace-pre-wrap break-words">
          {details}
        </pre>
        <div className="flex gap-2">
          <Button onClick={() => reset()}>Try again</Button>
          <Button variant="outline" onClick={() => window.location.assign('/')}>
            Home
          </Button>
        </div>
      </div>
    </main>
  );
}
