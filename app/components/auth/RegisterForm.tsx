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
import { UserRegisteredEventDetail } from '@/app/types/user';

export function RegisterForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validatePassword = (password: string) => {
    if (password.length < 8) return 'Password must be at least 8 characters';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    // verify username length
    if (username.length < 3) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Username must be at least 3 characters',
      });
      setIsLoading(false);
      return;
    }

    if (username.length > 50) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Username must be less than 50 characters',
      });
      setIsLoading(false);
      return;
    }

    // verify password match
    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Passwords do not match',
      });
      setIsLoading(false);
      return;
    }

    // verify password strength
    const passwordError = validatePassword(password);
    if (passwordError) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: passwordError,
      });
      setIsLoading(false);
      return;
    }

    try {
      const userData = {
        email,
        username,
        password,
        redirect_url: `${window.location.origin}/verify`,
      };

      const response = await fetch('/api/py/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          origin: window.location.origin,
        },
        body: JSON.stringify(userData),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
      }

      const responseData = await response.json();
      const userInfo = responseData.user;

      // custom event
      const eventDetail: UserRegisteredEventDetail = {
        id: userInfo.id,
        email: userInfo.email,
        username: userInfo.user_metadata.username,
        role: userInfo.role,
      };

      const customEvent = new CustomEvent('userRegistered', {
        detail: eventDetail,
        bubbles: true,
      });

      window.dispatchEvent(customEvent);

      toast({
        title: 'Registration successful',
        description: 'Please check your email to verify your account',
      });

      router.push('/login');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Registration Error',
        description: error.message || 'An unexpected error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Register</CardTitle>
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
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Registering...' : 'Register'}
            </Button>

            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="text-primary hover:underline">
                  Login here
                </Link>
              </span>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
