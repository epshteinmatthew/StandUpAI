import type { ReactNode } from 'react';
import { ServerErrorDetails } from '@/components/debug/server-error-details';
import { isNavigationError, serializeError, shouldShowDebugErrors } from '@/lib/debug/errors';

/** Returns error UI, or null if the error should propagate (redirect, notFound, etc.). */
export function renderCaughtError(error: unknown): ReactNode | null {
  if (isNavigationError(error) || !shouldShowDebugErrors()) {
    return null;
  }

  return <ServerErrorDetails error={serializeError(error)} />;
}
