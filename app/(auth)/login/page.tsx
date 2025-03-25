import { LoginForm } from '@/app/(auth)/login/components/LoginForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | UWvault',
  description: 'Login to UWvault',
};

export default function LoginPage() {
  return (
    <div className="container mx-auto flex h-[calc(100vh-5rem)] items-center justify-center px-4">
      <LoginForm />
    </div>
  );
}
