import { canSetupCompany } from '@/lib/auth/setup';
import { LoginForm } from '@/components/auth/login-form';
import { withErrorDisplay } from '@/lib/debug/with-error-display';

export default function LoginPage() {
  return withErrorDisplay(async () => {
    const showSetup = await canSetupCompany();

    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <LoginForm showSetup={showSetup} />
      </main>
    );
  });
}
