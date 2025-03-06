'use client';

import { UserList } from '@/app/manage-users/components/UserList';
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
      <div className="py-8">
        <UserList />
      </div>
    </ProtectedRoute>
  );
}
