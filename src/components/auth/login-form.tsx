'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface LoginFormProps {
  showSetup: boolean;
}

export function LoginForm({ showSetup }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', authUser.id)
      .single();

    router.push((profile as { role: string } | null)?.role === 'admin' ? '/admin' : '/dashboard');
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign in to StandupAI</CardTitle>
        <CardDescription>Use your company credentials.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
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
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <div className="mt-6 space-y-3 border-t pt-4 text-center text-sm text-muted-foreground">
          {showSetup ? (
            <p>
              First time here?{' '}
              <Link href="/setup" className="font-medium text-foreground hover:underline">
                Create your organization
              </Link>
            </p>
          ) : (
            <p>
              New teammate? Use the invite link from your admin — there is no public sign-up page.
            </p>
          )}
          <Link href="/" className="block hover:underline">
            Back to home
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
