'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { useToast } from '@/app/hooks/use-toast';
import { useAuth } from '@/app/hooks/useAuth';

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { getCurrentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch('/api/py/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.get('email'),
          password: formData.get('password'),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: 'Sign in failed',
          description:
            "Please check your email and password, or create a new account if you haven't registered.",
        });
        return;
      }

      localStorage.setItem('token', JSON.stringify(data.session));
      document.cookie = `token=${data.session.access_token}; path=/`;
      await getCurrentUser();

      toast({
        title: 'Welcome back!',
        description: 'Successfully signed in to your account.',
      });

      router.push('/');
      router.refresh();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign in failed',
        description: 'Unable to sign in. Please try again later.',
      });
    } finally {
      setIsLoading(false);
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
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>

            <div className="mt-4 text-center text-sm space-y-2">
              <div>
                <span className="text-muted-foreground">
                  Don't have an account?{' '}
                  <Link
                    href="/register"
                    className="text-primary hover:underline"
                  >
                    Register here
                  </Link>
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  Forgot your password?{' '}
                  <Link
                    href="/forgot-password"
                    className="text-primary hover:underline"
                  >
                    Reset it
                  </Link>
                </span>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
