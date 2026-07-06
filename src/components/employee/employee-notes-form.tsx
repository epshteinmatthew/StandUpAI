'use client';

import { useState, useTransition } from 'react';
import { updateEmployeeNotes } from '@/app/actions/employee';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface EmployeeNotesFormProps {
  initialNotes: string;
}

export function EmployeeNotesForm({ initialNotes }: EmployeeNotesFormProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    startTransition(async () => {
      await updateEmployeeNotes(notes);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes for your agent</CardTitle>
        <CardDescription>
          Share blockers or context — your agent uses this during the daily sync.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="e.g. Waiting on API credentials from DevOps…"
        />
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={isPending} variant="secondary" size="sm">
            {isPending ? 'Saving…' : 'Save notes'}
          </Button>
          {saved && <span className="text-sm text-emerald-600">Saved</span>}
        </div>
      </CardContent>
    </Card>
  );
}
