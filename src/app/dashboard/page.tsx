import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { AppShell } from '@/components/layout/app-shell';
import { EmployeeDashboard } from '@/components/employee/employee-dashboard';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'admin') redirect('/admin');

  return (
    <AppShell title="Your daily tasks">
      <EmployeeDashboard />
    </AppShell>
  );
}
