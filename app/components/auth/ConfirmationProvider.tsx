'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/app/hooks/use-toast';

interface ConfirmationContextType {
  status: 'loading' | 'success' | 'error';
  message: string;
}

const ConfirmationContext = createContext<ConfirmationContextType>({
  status: 'loading',
  message: '',
});

export function useConfirmation() {
  return useContext(ConfirmationContext);
}

export function ConfirmationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  );
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    // 从 URL hash 中获取参数
    const hashParams = new URLSearchParams(
      window.location.hash.substring(1) // 移除开头的 #
    );

    const type = hashParams.get('type');
    const accessToken = hashParams.get('access_token');

    if (type === 'signup' && accessToken) {
      setStatus('success');
      setMessage('Email verified successfully!');
      toast({
        title: 'Success',
        description: 'Your email has been verified successfully.',
      });

      // 可以选择保存 token
      // localStorage.setItem('access_token', accessToken);

      // 3秒后自动跳转到登录页面
      setTimeout(() => router.push('/login'), 3000);
    } else {
      setStatus('error');
      setMessage('Invalid verification link');
    }
  }, [router, toast]);

  return (
    <ConfirmationContext.Provider value={{ status, message }}>
      {children}
    </ConfirmationContext.Provider>
  );
}
