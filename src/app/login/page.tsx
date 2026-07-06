import { canSetupCompany } from '@/lib/auth/setup';
import { LoginForm } from '@/components/auth/login-form';
import { renderCaughtError } from '@/lib/debug/with-error-display';

export default async function LoginPage() {
  try {
    const showSetup = await canSetupCompany();

    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <LoginForm showSetup={showSetup} />
      </main>
    );
  } catch (error) {
    const errorUI = renderCaughtError(error);
    if (errorUI) return errorUI;
    throw error;
  }
}
