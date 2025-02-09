'use client';

import { createContext, useContext, useState } from 'react';

interface UserContextType {
  updateProfile: (data: { new_username: string }) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
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

  const resetPassword = async (email: string) => {
    const response = await fetch('/api/py/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Status:', response.status);
      console.error('Error data:', errorData);
      throw new Error('Failed to send reset password email');
    }

    return response.json();
  };

  return (
    <UserContext.Provider value={{ updateProfile, resetPassword }}>
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
