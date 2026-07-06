import type { ReactNode } from 'react';
import { ServerErrorDetails } from '@/components/debug/server-error-details';
import { isNavigationError, serializeError, shouldShowDebugErrors } from '@/lib/debug/errors';

export async function withErrorDisplay(render: () => Promise<ReactNode>): Promise<ReactNode> {
  try {
    return await render();
  } catch (error) {
    if (isNavigationError(error) || !shouldShowDebugErrors()) {
      throw error;
    }

    return <ServerErrorDetails error={serializeError(error)} />;
  }
}
