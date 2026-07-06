'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { format } from 'date-fns';
import { Copy, Trash2 } from 'lucide-react';
import {
  createTeamInvite,
  revokeTeamInvite,
} from '@/app/actions/invites';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { TeamInvite, User } from '@/types/database';

interface TeamPanelProps {
  teams: { id: string; name: string }[];
  members: Pick<User, 'id' | 'email' | 'full_name' | 'role' | 'team_id' | 'created_at'>[];
  invites: TeamInvite[];
}

export function TeamPanel({ teams, members, invites }: TeamPanelProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [teamId, setTeamId] = useState(teams[0]?.id ?? '');
  const [role, setRole] = useState<'employee' | 'admin'>('employee');
  const [message, setMessage] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const teamNameById = Object.fromEntries(teams.map((t) => [t.id, t.name]));

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setInviteUrl(null);

    startTransition(async () => {
      try {
        const { inviteUrl: url } = await createTeamInvite({
          email,
          fullName,
          teamId,
          role,
        });
        setInviteUrl(url);
        setMessage('Invite created. Share the link below with your teammate.');
        setEmail('');
        setFullName('');
        router.refresh();
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Failed to create invite');
      }
    });
  }

  function handleCopy() {
    if (!inviteUrl) return;
    void navigator.clipboard.writeText(inviteUrl);
    setMessage('Invite link copied to clipboard.');
  }

  function handleRevoke(inviteId: string) {
    startTransition(async () => {
      try {
        await revokeTeamInvite(inviteId);
        setMessage('Invite revoked.');
        router.refresh();
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Failed to revoke invite');
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invite team member</CardTitle>
          <CardDescription>
            Create an invite link. Your teammate opens it, sets a password, and can sign in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-name">Full name</Label>
                <Input
                  id="invite-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="invite-team">Team</Label>
                <select
                  id="invite-team"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <select
                  id="invite-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'employee' | 'admin')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <Button type="submit" disabled={isPending || !teams.length}>
              {isPending ? 'Creating invite…' : 'Create invite link'}
            </Button>
          </form>

          {inviteUrl && (
            <div className="mt-4 flex flex-col gap-2 rounded-md border bg-muted/40 p-3">
              <p className="text-xs font-medium text-muted-foreground">Invite link (expires in 7 days)</p>
              <code className="break-all text-sm">{inviteUrl}</code>
              <Button type="button" variant="outline" size="sm" className="w-fit" onClick={handleCopy}>
                <Copy className="mr-2 h-4 w-4" />
                Copy link
              </Button>
            </div>
          )}

          {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending invites</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!invites.length ? (
            <p className="text-sm text-muted-foreground">No pending invites.</p>
          ) : (
            invites.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
              >
                <div>
                  <p className="font-medium">{invite.full_name || invite.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {invite.email} · {teamNameById[invite.team_id ?? ''] ?? 'No team'} · expires{' '}
                    {format(new Date(invite.expires_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleRevoke(invite.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Revoke
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((member, index) => (
            <div key={member.id}>
              {index > 0 && <Separator className="mb-3" />}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{member.full_name || member.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {member.email}
                    {member.team_id ? ` · ${teamNameById[member.team_id] ?? 'Team'}` : ''}
                  </p>
                </div>
                <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                  {member.role}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
