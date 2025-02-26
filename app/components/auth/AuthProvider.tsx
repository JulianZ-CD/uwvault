'use client';

import { createContext, useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { User, AuthContextType } from '@/app/types/user';

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const getCurrentUser = async () => {
    try {
      const tokenStr = localStorage.getItem('token');
      console.log('Token from storage:', tokenStr);

      if (!tokenStr) {
        setUser(null);
        setIsLoading(false);
        return null; // if no token, return null
      }

      // parse token data
      let tokenData;

      try {
        tokenData = JSON.parse(tokenStr);
      } catch (e) {
        tokenData = { access_token: tokenStr };
      }

      const accessToken = tokenData?.access_token;
      if (!accessToken) {
        throw new Error('Missing access token');
      }

      const response = await fetch('/api/py/auth/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token');
        }
        return null; // if authentication failed, return null
      }

      const userData = await response.json();
      console.log('User data:', userData);
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Error in getCurrentUser:', error);
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');

      try {
        // format compatible processing
        if (storedToken) {
          let parsedToken;
          try {
            parsedToken = JSON.parse(storedToken);
          } catch {
            // old format string token, convert to object format
            parsedToken = { access_token: storedToken };
            localStorage.setItem('token', JSON.stringify(parsedToken));
          }
        }

        await getCurrentUser();
      } catch (error) {
        console.error('Init auth error:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const logout = async () => {
    try {
      const tokenStr = localStorage.getItem('token');
      if (tokenStr) {
        const tokenData = JSON.parse(tokenStr);
        const accessToken = tokenData?.access_token;

        if (accessToken) {
          await fetch('/api/py/auth/logout', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      document.cookie =
        'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      setUser(null);
      router.push('/');
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

  const login = async (credentials: { email: string; password: string }) => {
    try {
      const response = await fetch('/api/py/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      localStorage.setItem('token', JSON.stringify(data.session));
      document.cookie = `token=${data.session.access_token}; path=/`;
      await getCurrentUser();
    } catch (error) {
      throw error;
    }
  };

  const value = {
    user,
    isLoading,
    error,
    getCurrentUser,
    login,
    logout,
    isAdmin,
    requireAuth,
    requireAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
