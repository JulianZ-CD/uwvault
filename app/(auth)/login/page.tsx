import { LoginForm } from '@/app/(auth)/login/components/LoginForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | UWvault',
  description: 'Login to UWvault',
};

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <LoginForm />
    </main>
  );
}
