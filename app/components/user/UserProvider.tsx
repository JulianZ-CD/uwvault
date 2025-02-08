'use client';

import { createContext, useContext, useState } from 'react';

interface UserProfile {
  username: string;
  email: string;
}

interface UserContextType {
  updateProfile: (data: { new_username: string }) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const updateProfile = async (data: { new_username: string }) => {
    const tokenStr = localStorage.getItem('token');
    if (!tokenStr) {
      throw new Error('No authentication token found');
    }

    const tokenData = JSON.parse(tokenStr);
    const response = await fetch('/api/py/auth/users/username', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenData.access_token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update profile');
    }

    return response.json();
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    // 实现修改密码的逻辑
  };

  return (
    <UserContext.Provider value={{ updateProfile, changePassword }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
