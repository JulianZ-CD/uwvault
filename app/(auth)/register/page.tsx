import { RegisterForm } from '@/app/components/auth/RegisterForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Register | UWvault',
  description: 'Register UWvault account',
};

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <RegisterForm />
    </main>
  );
}
