'use client';

import { useState, useTransition } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, Play } from 'lucide-react';
import { triggerTeamSync } from '@/app/actions/admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { AdminMeetingLog, MeetingStep } from '@/types/database';

interface MeetingLogsPanelProps {
  meetings: AdminMeetingLog[];
  teams: { id: string; name: string }[];
}

const STEP_LABELS: Record<MeetingStep['name'], string> = {
  check_off: '1. Check-off',
  blocker_resolution: '2. Blocker resolution',
  agenda_goals: '3. Agenda & goals',
  task_assignment: '4. Task assignment',
};

export function MeetingLogsPanel({ meetings, teams }: MeetingLogsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  function handleTriggerSync(teamId: string) {
    startTransition(async () => {
      try {
        await triggerTeamSync(teamId);
        setSyncMessage('Sync queued — refresh in a moment to see results.');
      } catch (e) {
        setSyncMessage(e instanceof Error ? e.message : 'Failed to trigger sync');
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Run sync manually</CardTitle>
          <CardDescription>
            Runs sync via Inngest. Local dev events appear at{' '}
            <a href="http://localhost:8288" className="underline" target="_blank" rel="noreferrer">
              localhost:8288
            </a>{' '}
            (not the Inngest Cloud dashboard).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {teams.map((team) => (
            <Button
              key={team.id}
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => handleTriggerSync(team.id)}
            >
              <Play className="mr-2 h-4 w-4" />
              Sync {team.name}
            </Button>
          ))}
          {syncMessage && <p className="w-full text-sm text-muted-foreground">{syncMessage}</p>}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {!meetings.length ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              No meeting logs yet. Run a sync to generate the first transcript.
            </CardContent>
          </Card>
        ) : (
          meetings.map((meeting) => {
            const expanded = expandedId === meeting.id;
            return (
              <Card key={meeting.id}>
                <CardHeader className="cursor-pointer" onClick={() => setExpandedId(expanded ? null : meeting.id)}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {expanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        {meeting.team_name} — {format(new Date(meeting.scheduled_for), 'PPp')}
                      </CardTitle>
                      <CardDescription>
                        {meeting.status === 'failed' && meeting.error_message
                          ? meeting.error_message.slice(0, 200)
                          : meeting.summary || 'No summary yet.'}
                      </CardDescription>
                    </div>
                    <StatusBadge status={meeting.status} />
                  </div>
                </CardHeader>
                {expanded && meeting.status === 'failed' && meeting.error_message ? (
                  <CardContent>
                    <p className="text-sm text-destructive whitespace-pre-wrap">{meeting.error_message}</p>
                  </CardContent>
                ) : null}
                {expanded && meeting.transcript?.steps?.length ? (
                  <CardContent className="space-y-6">
                    {meeting.transcript.steps.map((step) => (
                      <div key={step.name}>
                        <h4 className="font-medium mb-2">{STEP_LABELS[step.name]}</h4>
                        {step.decisions?.length ? (
                          <ul className="mb-3 list-disc pl-5 text-sm text-muted-foreground">
                            {step.decisions.map((d, i) => (
                              <li key={i}>{d}</li>
                            ))}
                          </ul>
                        ) : null}
                        <div className="space-y-2">
                          {step.agent_turns.map((turn, i) => (
                            <div key={i} className="rounded-md bg-muted/50 p-3 text-sm">
                              <span className="font-medium">{turn.full_name}: </span>
                              {turn.message}
                            </div>
                          ))}
                        </div>
                        <Separator className="mt-4" />
                      </div>
                    ))}
                  </CardContent>
                ) : null}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: AdminMeetingLog['status'] }) {
  const variant =
    status === 'completed' ? 'success' : status === 'failed' ? 'destructive' : 'secondary';

  return (
    <Badge variant={variant === 'destructive' ? 'outline' : variant} className="capitalize shrink-0">
      {status}
    </Badge>
  );
}
