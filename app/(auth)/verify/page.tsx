'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  );
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      // 解析 hash 中的参数
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const type = params.get('type');

      if (accessToken && type === 'signup') {
        // 验证成功
        setStatus('success');
        setMessage('Your email has been verified successfully!');
      } else {
        setStatus('error');
        setMessage('Invalid verification link.');
      }
    } else {
      setStatus('error');
      setMessage('No verification data found.');
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Email Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center space-y-4">
            {status === 'loading' && (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            )}
            {status === 'success' && (
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            )}
            {status === 'error' && (
              <XCircle className="h-16 w-16 text-red-500" />
            )}

            <Alert>
              <AlertDescription>{message}</AlertDescription>
            </Alert>

            {status === 'success' && (
              <Button className="w-full" onClick={() => router.push('/login')}>
                Continue to Login
              </Button>
            )}

            {status === 'error' && (
              <Button
                className="w-full"
                variant="outline"
                onClick={() => router.push('/')}
              >
                Return to Home
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
