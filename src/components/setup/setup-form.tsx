'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { setupCompany } from '@/app/actions/setup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SetupForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const { email } = await setupCompany({
          companyName: String(form.get('companyName') ?? ''),
          teamName: String(form.get('teamName') ?? ''),
          adminEmail: String(form.get('adminEmail') ?? ''),
          adminFullName: String(form.get('adminFullName') ?? ''),
          adminPassword: String(form.get('adminPassword') ?? ''),
        });

        const supabase = createClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: String(form.get('adminPassword') ?? ''),
        });

        if (signInError) {
          setError(signInError.message);
          return;
        }

        router.push('/admin');
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Setup failed');
      }
    });
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Create your organization</CardTitle>
        <CardDescription>
          Set up your company and admin account. You can invite team members from the admin
          dashboard after signing in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company name</Label>
            <Input id="companyName" name="companyName" required placeholder="Acme Engineering" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teamName">First team name</Label>
            <Input id="teamName" name="teamName" required placeholder="Platform" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminFullName">Your name</Label>
            <Input id="adminFullName" name="adminFullName" required placeholder="Alex Admin" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminEmail">Work email</Label>
            <Input id="adminEmail" name="adminEmail" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminPassword">Password</Label>
            <Input
              id="adminPassword"
              name="adminPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Creating organization…' : 'Create organization'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
