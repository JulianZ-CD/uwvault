'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { ReactNode } from 'react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface AuthContextType {
  user: any | null;
  isLoading: boolean;
  error: string | null;
  getCurrentUser: () => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: () => boolean;
  requireAuth: () => Promise<void>;
  requireAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getCurrentUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log('Current user:', user);
      setUser(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      setError('Failed to get user');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getCurrentUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      setError('Failed to logout');
    }
  };

  const isAdmin = () => user?.role === 'admin';

  const requireAuth = async () => {
    if (!user) {
      await getCurrentUser();
    }
    if (!user) {
      throw new Error('Authentication required');
    }
  };

  const requireAdmin = async () => {
    await requireAuth();
    if (!isAdmin()) {
      throw new Error('Admin access required');
    }
  };

  const value = {
    user,
    isLoading,
    error,
    getCurrentUser,
    logout,
    isAdmin,
    requireAuth,
    requireAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
