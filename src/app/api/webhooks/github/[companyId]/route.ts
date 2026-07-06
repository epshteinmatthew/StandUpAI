import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ingestGithubPush } from '@/lib/github/ingest-push';
import { verifyGithubSignature } from '@/lib/github/webhook';

export const runtime = 'nodejs';

interface RouteParams {
  params: { companyId: string };
}

export async function POST(request: Request, { params }: RouteParams) {
  const companyId = params.companyId;
  const rawBody = await request.text();
  const event = request.headers.get('x-github-event');
  const signature = request.headers.get('x-hub-signature-256');

  const supabase = createAdminClient();

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, github_webhook_secret')
    .eq('id', companyId)
    .maybeSingle();

  if (companyError || !company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  const secret = (company as { github_webhook_secret: string | null }).github_webhook_secret;
  if (!secret) {
    return NextResponse.json({ error: 'GitHub webhook not configured' }, { status: 503 });
  }

  if (!verifyGithubSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (event === 'ping') {
    return NextResponse.json({ ok: true, message: 'pong' });
  }

  if (event !== 'push') {
    return NextResponse.json({ ok: true, ignored: event ?? 'unknown' });
  }

  try {
    const result = await ingestGithubPush(companyId, payload);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ingest failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
