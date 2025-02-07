import { LoginForm } from '@/app/components/auth/LoginForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '登录 | UWvault',
  description: '登录到 UWvault',
};

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <LoginForm />
    </main>
  );
}
