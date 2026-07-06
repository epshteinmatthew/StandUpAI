import { createAdminClient } from '@/lib/supabase/admin';
import {
  collectPushCommits,
  noreplyGithubUsername,
  type GithubPushCommit,
} from '@/lib/github/webhook';

interface CompanyUser {
  id: string;
  email: string;
  github_username: string | null;
}

function resolveAuthorLogin(commit: GithubPushCommit): string | null {
  const login = commit.author.username?.trim().toLowerCase();
  if (login) return login;

  return noreplyGithubUsername(commit.author.email?.toLowerCase() ?? null);
}

function matchUser(
  commit: GithubPushCommit,
  users: CompanyUser[]
): CompanyUser | undefined {
  const login = resolveAuthorLogin(commit);
  if (login) {
    const byGithub = users.find((u) => u.github_username?.toLowerCase() === login);
    if (byGithub) return byGithub;
  }

  const email = commit.author.email?.trim().toLowerCase();
  if (email) {
    return users.find((u) => u.email.toLowerCase() === email);
  }

  return undefined;
}

export async function ingestGithubPush(companyId: string, payload: unknown) {
  const body = payload as {
    ref?: string;
    deleted?: boolean;
    repository?: { full_name?: string };
    commits?: GithubPushCommit[];
    head_commit?: GithubPushCommit | null;
  };

  if (body.deleted) {
    return { ingested: 0, skipped: 0, unmatched: 0, repository: body.repository?.full_name ?? null };
  }

  const commits = collectPushCommits(body);
  if (!commits.length) {
    return { ingested: 0, skipped: 0, unmatched: 0, repository: body.repository?.full_name ?? null };
  }

  const supabase = createAdminClient();

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, github_username')
    .eq('company_id', companyId);

  if (usersError) throw new Error(usersError.message);

  const companyUsers = (users ?? []) as CompanyUser[];
  const repository = body.repository?.full_name ?? null;

  let ingested = 0;
  let skipped = 0;
  let unmatched = 0;

  for (const commit of commits) {
    const user = matchUser(commit, companyUsers);
    if (!user) {
      unmatched += 1;
      continue;
    }

    const shortHash = commit.id.slice(0, 7);
    const { error } = await supabase.from('commits_logs').upsert(
      {
        user_id: user.id,
        commit_hash: shortHash,
        message: commit.message.trim() || '(no message)',
        repository,
        committed_at: commit.timestamp,
      },
      { onConflict: 'user_id,commit_hash', ignoreDuplicates: false }
    );

    if (error) {
      skipped += 1;
    } else {
      ingested += 1;
    }
  }

  return { ingested, skipped, unmatched, repository };
}
