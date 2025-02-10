'use client';

import { UserList } from '@/app/components/manage/UserList';
import { ProtectedRoute } from '@/app/components/auth/ProtectedRoute';
import { useAuth } from '@/app/hooks/useAuth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ManageUsersPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/');
    }
  }, [user, router]);

  return (
    <ProtectedRoute>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">Manage Users</h1>
        <UserList />
      </div>
    </ProtectedRoute>
  );
}
