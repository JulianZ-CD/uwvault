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
    // get parameters from URL hash
    const hashParams = new URLSearchParams(
      window.location.hash.substring(1) // remove the leading #
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

      // optional: save token to localStorage
      // localStorage.setItem('access_token', accessToken);

      // 3 seconds later, auto redirect to login page
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
