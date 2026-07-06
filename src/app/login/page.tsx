import { canSetupCompany } from '@/lib/auth/setup';
import { LoginForm } from '@/components/auth/login-form';

export default async function LoginPage() {
  const showSetup = await canSetupCompany();

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <LoginForm showSetup={showSetup} />
    </main>
  );
}
