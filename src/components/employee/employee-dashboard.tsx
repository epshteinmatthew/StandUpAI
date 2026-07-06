import { format } from 'date-fns';
import { Bot } from 'lucide-react';
import { requireEmployee } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { EmployeeNotesForm } from '@/components/employee/employee-notes-form';
import type { Agent, EmployeeTodayTask } from '@/types/database';

export async function EmployeeDashboard() {
  const user = await requireEmployee();
  const supabase = await createClient();

  const { data: tasks } = await supabase
    .from('employee_today_tasks')
    .select('*')
    .eq('assigned_to', user.id)
    .order('due_date', { ascending: true });

  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const taskList = (tasks ?? []) as EmployeeTodayTask[];
  const agentData = agent as Agent | null;

  const agentInitials = (agentData?.name ?? 'Agent')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16 border-2 border-primary/20">
          {agentData?.avatar_url ? (
            <AvatarImage src={agentData.avatar_url} alt={agentData.name} />
          ) : null}
          <AvatarFallback className="bg-primary/10 text-primary text-lg">
            {agentInitials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm text-muted-foreground">Your agent</p>
          <h1 className="text-2xl font-semibold">{agentData?.name ?? 'Your Agent'}</h1>
          <p className="text-sm text-muted-foreground">
            Tasks below are assigned by your agent. Completion is detected automatically from your
            work activity.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Your Tasks For Today
          </CardTitle>
          <CardDescription>Read-only — your agent updates status from commits and sync.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!taskList.length ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              No pending tasks due today. Your agent will assign new items after the daily sync.
            </p>
          ) : (
            taskList.map((task, index) => (
              <div key={task.id}>
                {index > 0 && <Separator className="mb-4" />}
                <TaskRow task={task} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <EmployeeNotesForm initialNotes={user.employee_notes} />
    </div>
  );
}

function TaskRow({ task }: { task: EmployeeTodayTask }) {
  return (
    <div className="space-y-1">
      <div className="flex items-start justify-between gap-4">
        <p className="font-medium leading-snug">{task.title}</p>
        <Badge variant={task.status === 'completed' ? 'success' : 'warning'}>
          {task.status}
        </Badge>
      </div>
      {task.description ? (
        <p className="text-sm text-muted-foreground">{task.description}</p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Due {format(new Date(task.due_date), 'MMM d, yyyy')} · Assigned by {task.created_by}
      </p>
    </div>
  );
}
