'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  );
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // 直接从 URL 的 hash 部分获取参数
        const hash = window.location.hash.substring(1); // 移除开头的 #
        console.log('Hash:', hash);

        if (!hash) {
          throw new Error('No verification token found');
        }

        // 解析 hash 中的所有参数
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const expiresAt = params.get('expires_at');
        const refreshToken = params.get('refresh_token');
        const tokenType = params.get('token_type');
        const type = params.get('type');

        console.log('Parsed params:', {
          accessToken: accessToken?.substring(0, 10) + '...',
          expiresAt,
          tokenType,
          type,
        });

        if (!accessToken) {
          throw new Error('No access token found');
        }

        if (type === 'signup') {
          // 存储完整的认证信息
          localStorage.setItem(
            'token',
            JSON.stringify({
              access_token: accessToken,
              expires_at: expiresAt,
              refresh_token: refreshToken,
              token_type: tokenType,
            })
          );

          setStatus('success');
          setMessage('Email verified successfully! Redirecting to login...');

          // 3秒后自动跳转
          setTimeout(() => router.push('/login'), 3000);
        } else {
          throw new Error('Invalid verification link');
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage(
          error instanceof Error
            ? error.message
            : 'An error occurred during verification'
        );
      }
    };

    verifyEmail();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Email Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            {status === 'loading' && (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
              </div>
            )}
            {status === 'success' && (
              <div className="flex flex-col items-center space-y-2">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
                <p className="text-sm text-green-600 font-medium">{message}</p>
              </div>
            )}
            {status === 'error' && (
              <div className="flex flex-col items-center space-y-2">
                <XCircle className="h-16 w-16 text-red-500" />
                <Alert variant="destructive">
                  <AlertDescription className="text-center">
                    {message}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {status !== 'loading' && (
              <Button
                className="w-full mt-4"
                onClick={() =>
                  router.push(status === 'success' ? '/login' : '/')
                }
              >
                {status === 'success' ? 'Continue to Login' : 'Return to Home'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
