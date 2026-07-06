'use client';

import { useState, useTransition } from 'react';
import { Copy, RefreshCw } from 'lucide-react';
import {
  getGithubIntegration,
  rotateGithubWebhookSecret,
  updateUserGithubUsername,
} from '@/app/actions/github';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { User } from '@/types/database';

interface GithubIntegrationPanelProps {
  integration: {
    companyId: string;
    webhookUrl: string;
    hasSecret: boolean;
  };
  members: Pick<User, 'id' | 'full_name' | 'email' | 'github_username'>[];
}

export function GithubIntegrationPanel({ integration, members }: GithubIntegrationPanelProps) {
  const [webhookUrl, setWebhookUrl] = useState(integration.webhookUrl);
  const [hasSecret, setHasSecret] = useState(integration.hasSecret);
  const [secret, setSecret] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRotateSecret() {
    startTransition(async () => {
      try {
        const { secret: newSecret } = await rotateGithubWebhookSecret();
        setSecret(newSecret);
        setHasSecret(true);
        setMessage('New webhook secret generated. Update it in your GitHub webhook settings.');
        const latest = await getGithubIntegration();
        setWebhookUrl(latest.webhookUrl);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Failed to generate secret');
      }
    });
  }

  function handleCopy(value: string, label: string) {
    void navigator.clipboard.writeText(value);
    setMessage(`${label} copied to clipboard.`);
  }

  function handleGithubUsername(userId: string, value: string) {
    startTransition(async () => {
      try {
        await updateUserGithubUsername(userId, value);
        setMessage('GitHub username saved.');
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Failed to save username');
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>GitHub push webhook</CardTitle>
          <CardDescription>
            Ingest commits into StandupAI so agents can check off tasks during daily sync. Configure
            a repository webhook for <strong>push</strong> events.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Payload URL</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input readOnly value={webhookUrl} className="font-mono text-xs" />
              <Button type="button" variant="outline" onClick={() => handleCopy(webhookUrl, 'Webhook URL')}>
                <Copy className="mr-2 h-4 w-4" />
                Copy URL
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Webhook secret</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleRotateSecret}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {hasSecret ? 'Rotate secret' : 'Generate secret'}
              </Button>
              {secret && (
                <>
                  <code className="rounded bg-muted px-2 py-1 text-xs break-all">{secret}</code>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleCopy(secret, 'Secret')}>
                    Copy secret
                  </Button>
                </>
              )}
            </div>
            {hasSecret && !secret && (
              <p className="text-xs text-muted-foreground">
                A secret is configured. Rotate to reveal a new one (you must update GitHub).
              </p>
            )}
          </div>

          <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">GitHub setup</p>
            <p>1. Repo → Settings → Webhooks → Add webhook</p>
            <p>2. Content type: <code>application/json</code></p>
            <p>3. Events: <code>Just the push event</code></p>
            <p>4. Paste the payload URL and secret above</p>
          </div>

          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Map GitHub users</CardTitle>
          <CardDescription>
            Set each employee&apos;s GitHub username so push commits are attributed correctly. Email
            matching is used as a fallback.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {members
            .filter((m) => m.email)
            .map((member) => (
              <div key={member.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{member.full_name || member.email}</p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    defaultValue={member.github_username ?? ''}
                    placeholder="github-username"
                    className="w-44 font-mono text-sm"
                    onBlur={(e) => {
                      const next = e.target.value.trim();
                      const prev = member.github_username ?? '';
                      if (next !== prev) handleGithubUsername(member.id, next);
                    }}
                  />
                </div>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
