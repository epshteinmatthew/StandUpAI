import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getInvitePreview } from '@/app/actions/invites';
import { AcceptInviteForm } from '@/components/invite/accept-invite-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface InvitePageProps {
  params: { token: string };
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = params;
  const preview = await getInvitePreview(token);

  if (!preview) notFound();

  if (preview.accepted) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invite already used</CardTitle>
            <CardDescription>This invite has already been accepted.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/login">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (preview.expired) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invite expired</CardTitle>
            <CardDescription>Ask your admin to send a new invite link.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Back to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <AcceptInviteForm token={token} preview={preview} />
    </main>
  );
}
