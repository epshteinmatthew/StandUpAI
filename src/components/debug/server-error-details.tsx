'use client';

import type { SerializedError } from '@/lib/debug/errors';
import { formatErrorForDisplay } from '@/lib/debug/errors';
import { Button } from '@/components/ui/button';

interface ServerErrorDetailsProps {
  error: SerializedError;
  title?: string;
}

export function ServerErrorDetails({ error, title = 'Server error' }: ServerErrorDetailsProps) {
  const details = formatErrorForDisplay(error);

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-3xl space-y-4">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">
            Debug mode is on in production. Set <code className="text-xs">HIDE_SERVER_ERRORS=1</code>{' '}
            on Vercel to hide these details again.
          </p>
        </div>
        <pre className="max-h-[70vh] overflow-auto rounded-md border bg-muted p-4 text-left text-xs whitespace-pre-wrap break-words">
          {details}
        </pre>
        <div className="flex gap-2">
          <Button onClick={() => window.location.reload()}>Reload</Button>
          <Button variant="outline" onClick={() => window.location.assign('/')}>
            Home
          </Button>
        </div>
      </div>
    </main>
  );
}
