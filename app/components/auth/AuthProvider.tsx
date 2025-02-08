'use client';

import { createContext, useState, useEffect, type ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  username: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  getCurrentUser: () => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: () => boolean;
  requireAuth: () => Promise<void>;
  requireAdmin: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getCurrentUser = async () => {
    try {
      const tokenStr = localStorage.getItem('token');
      console.log('Token from storage:', tokenStr);

      if (!tokenStr) {
        setUser(null);
        setIsLoading(false);
        return null; // 如果没有 token，静默返回
      }

      // 解析 token 数据
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
          Authorization: `Bearer ${accessToken}`, // 保持原有的 Bearer token 格式
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token');
        }
        return null; // 认证失败时静默返回
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

  // 修改初始化逻辑
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');

      try {
        // 格式兼容处理
        if (storedToken) {
          let parsedToken;
          try {
            parsedToken = JSON.parse(storedToken);
          } catch {
            // 旧格式的字符串 token，转换为对象格式
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

  // 修改 logout 方法
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
      setUser(null);
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
