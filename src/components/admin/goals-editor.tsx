'use client';

import { useState, useTransition } from 'react';
import { updateCompanyGoals } from '@/app/actions/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface GoalsEditorProps {
  initialGoals: string;
}

export function GoalsEditor({ initialGoals }: GoalsEditorProps) {
  const [goals, setGoals] = useState(initialGoals);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSave() {
    startTransition(async () => {
      try {
        await updateCompanyGoals(goals);
        setMessage('Goals saved');
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Failed to save');
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company goals</CardTitle>
        <CardDescription>
          High-level objectives your agents reference during daily sync and task assignment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          rows={8}
          placeholder="Ship API v2 by Q3. Reduce incident response time by 20%…"
        />
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save goals'}
          </Button>
          {message && <span className="text-sm text-muted-foreground">{message}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
