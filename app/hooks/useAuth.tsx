'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  username: string;
  role?: string;
  // other user attributes...
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

const AuthContext = createContext<AuthContextType | null>(null);

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
        return;
      }

      // 解析 token 数据
      let tokenData;
      try {
        tokenData = JSON.parse(tokenStr);
      } catch (e) {
        // 兼容旧格式的纯字符串 token
        tokenData = { access_token: tokenStr };
      }

      // 确保 access_token 存在
      const accessToken = tokenData?.access_token;
      if (!accessToken) {
        throw new Error('Missing access token');
      }

      const response = await fetch('/api/py/auth/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`, // 使用正确的 access_token
        },
      });

      // 保持原有错误处理逻辑...
    } catch (error) {
      console.error('Error in getCurrentUser:', error);
      setUser(null);
      localStorage.removeItem('token'); // 清除无效 token
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
