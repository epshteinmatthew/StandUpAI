import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { AppShell } from '@/components/layout/app-shell';
import { EmployeeDashboard } from '@/components/employee/employee-dashboard';
import { renderCaughtError } from '@/lib/debug/with-error-display';

export default async function DashboardPage() {
  try {
    const user = await getCurrentUser();
    if (!user) redirect('/login');
    if (user.role === 'admin') redirect('/admin');

    return (
      <AppShell title="Your daily tasks">
        <EmployeeDashboard />
      </AppShell>
    );
  } catch (error) {
    const errorUI = renderCaughtError(error);
    if (errorUI) return errorUI;
    throw error;
  }
}
