import type { AgentSyncContext } from '@/types/database';
import { runMockMeetingProtocol } from '@/lib/sync/mock-meeting-protocol';
import { runFullMeetingProtocol } from '@/lib/sync/meeting-protocol';

/** Fall back to mock only for hard billing/auth failures — not rate limits or schema issues. */
function isLlmBillingError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('Unauthorized') ||
    message.includes('invalid api key') ||
    message.includes('Invalid API Key') ||
    message.includes('API key not valid') ||
    message.includes('insufficient') ||
    message.includes('billing')
  );
}

export async function runMeetingProtocol(context: AgentSyncContext) {
  if (process.env.SYNC_MODE === 'mock') {
    return runMockMeetingProtocol(context);
  }

  try {
    return await runFullMeetingProtocol(context);
  } catch (error) {
    if (isLlmBillingError(error)) {
      const result = await runMockMeetingProtocol(context);
      return {
        ...result,
        summary: `[Mistral unavailable — mock fallback] ${result.summary}`,
      };
    }
    throw error;
  }
}
