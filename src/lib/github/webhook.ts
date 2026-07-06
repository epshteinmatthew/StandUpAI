import { createHmac, timingSafeEqual } from 'crypto';

export function verifyGithubSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader?.startsWith('sha256=') || !secret) return false;

  const expected = `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;

  try {
    return timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}

export interface GithubPushCommit {
  id: string;
  message: string;
  timestamp: string;
  author: {
    username?: string | null;
    email?: string | null;
  };
}

export interface GithubPushPayload {
  ref?: string;
  deleted?: boolean;
  repository?: {
    full_name?: string;
  };
  commits?: GithubPushCommit[];
  head_commit?: GithubPushCommit | null;
}

export function collectPushCommits(payload: GithubPushPayload): GithubPushCommit[] {
  const bySha = new Map<string, GithubPushCommit>();

  for (const commit of payload.commits ?? []) {
    if (commit?.id) bySha.set(commit.id, commit);
  }

  if (payload.head_commit?.id) {
    bySha.set(payload.head_commit.id, payload.head_commit);
  }

  return [...bySha.values()];
}

export function noreplyGithubUsername(email: string | null | undefined): string | null {
  if (!email) return null;
  const match = email.match(/^(?:\d+\+)?([^@+]+)@users\.noreply\.github\.com$/i);
  return match?.[1]?.toLowerCase() ?? null;
}
