'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { useToast } from '@/app/hooks/use-toast';

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      // 使用 rewrite 路径
      const response = await fetch('/api/py/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        // 不需要 credentials: 'include'，因为不是跨域请求
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      console.log('Login successful:', data);

      // 存储用户信息和token
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);

      // 刷新路由以更新导航栏状态
      router.refresh();
      router.push('/');

      toast({
        title: 'Login successful',
        description: 'Welcome back!',
      });
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>

            <Button type="submit" className="w-full">
              Login
            </Button>

            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">
                Don't have an account?{' '}
                <Link href="/register" className="text-primary hover:underline">
                  Register here
                </Link>
              </span>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
