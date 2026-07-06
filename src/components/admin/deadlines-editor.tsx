'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { updateTeamDeadlines } from '@/app/actions/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Team, TeamDeadline } from '@/types/database';

interface DeadlinesEditorProps {
  teams: Pick<Team, 'id' | 'name' | 'deadlines'>[];
}

export function DeadlinesEditor({ teams }: DeadlinesEditorProps) {
  return (
    <div className="space-y-6">
      {teams.map((team) => (
        <TeamDeadlinesCard key={team.id} team={team} />
      ))}
    </div>
  );
}

function TeamDeadlinesCard({ team }: { team: Pick<Team, 'id' | 'name' | 'deadlines'> }) {
  const [deadlines, setDeadlines] = useState<TeamDeadline[]>(team.deadlines ?? []);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function addDeadline() {
    setDeadlines((prev) => [
      ...prev,
      { project: '', deadline: new Date().toISOString().slice(0, 10), description: '' },
    ]);
  }

  function updateDeadline(index: number, field: keyof TeamDeadline, value: string) {
    setDeadlines((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function removeDeadline(index: number) {
    setDeadlines((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await updateTeamDeadlines(team.id, deadlines);
        setMessage('Deadlines saved');
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Failed to save');
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{team.name} — project deadlines</CardTitle>
        <CardDescription>Agents align daily work to these milestones.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {deadlines.map((deadline, index) => (
          <div key={index} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Project</Label>
              <Input
                value={deadline.project}
                onChange={(e) => updateDeadline(index, 'project', e.target.value)}
                placeholder="API v2 launch"
              />
            </div>
            <div className="space-y-2">
              <Label>Deadline</Label>
              <Input
                type="date"
                value={deadline.deadline}
                onChange={(e) => updateDeadline(index, 'deadline', e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description (optional)</Label>
              <Input
                value={deadline.description ?? ''}
                onChange={(e) => updateDeadline(index, 'description', e.target.value)}
                placeholder="Must include auth migration"
              />
            </div>
            <div className="sm:col-span-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeDeadline(index)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </Button>
            </div>
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={addDeadline}>
            <Plus className="mr-2 h-4 w-4" />
            Add deadline
          </Button>
          <Button onClick={handleSave} disabled={isPending} size="sm">
            {isPending ? 'Saving…' : 'Save deadlines'}
          </Button>
          {message && <span className="text-sm text-muted-foreground">{message}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
