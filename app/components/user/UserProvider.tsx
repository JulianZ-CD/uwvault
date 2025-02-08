'use client';

import { createContext, useContext, useState } from 'react';

interface UserContextType {
  updateProfile: (data: any) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const updateProfile = async (data: any) => {
    // 实现更新用户资料的逻辑
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
