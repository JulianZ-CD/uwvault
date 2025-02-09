'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';
import { useAuth } from '@/app/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  loadingComponent,
}: ProtectedRouteProps) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      loadingComponent || (
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner />
        </div>
      )
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
