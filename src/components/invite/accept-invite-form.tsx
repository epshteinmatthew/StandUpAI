'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { acceptTeamInvite } from '@/app/actions/invites';
import type { InvitePreview } from '@/app/actions/invites';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AcceptInviteFormProps {
  token: string;
  preview: InvitePreview;
}

export function AcceptInviteForm({ token, preview }: AcceptInviteFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(preview.full_name);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const { email, role } = await acceptTeamInvite({ token, fullName, password });

        const supabase = createClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message);
          return;
        }

        router.push(role === 'admin' ? '/admin' : '/dashboard');
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to accept invite');
      }
    });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Join {preview.company_name}</CardTitle>
        <CardDescription>
          You&apos;ve been invited as {preview.role === 'admin' ? 'an admin' : 'a team member'}
          {preview.team_name ? ` on ${preview.team_name}` : ''}. Set a password to activate your
          account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={preview.email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Creating account…' : 'Accept invite'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
