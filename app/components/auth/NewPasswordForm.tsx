// 'use client';

// import { useState, useEffect } from 'react';
// import { useRouter, useSearchParams } from 'next/navigation';
// import Link from 'next/link';
// import {
//   Card,
//   CardContent,
//   CardHeader,
//   CardTitle,
//   CardDescription,
// } from '@/app/components/ui/card';
// import { Label } from '@/app/components/ui/label';
// import { Input } from '@/app/components/ui/input';
// import { Button } from '@/app/components/ui/button';
// import { Alert, AlertDescription } from '@/app/components/ui/alert';
// import { useToast } from '@/app/hooks/use-toast';
// import { Eye, EyeOff } from 'lucide-react';

// export function NewPasswordForm() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const { toast } = useToast();
//   const [newPassword, setNewPassword] = useState('');
//   const [confirmPassword, setConfirmPassword] = useState('');
//   const [error, setError] = useState<string | null>(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const [showPassword, setShowPassword] = useState(false);
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false);

//   // 添加 recovery token 状态，使用 localStorage 持久化
//   const [recoveryToken, setRecoveryToken] = useState<string | null>(() => {
//     // 初始化时从 localStorage 获取
//     if (typeof window !== 'undefined') {
//       return localStorage.getItem('recoveryToken');
//     }
//     return null;
//   });

//   // 在组件加载时获取并保存 recovery token
//   useEffect(() => {
//     // 从 URL 获取 token
//     const urlToken = searchParams.get('token');
//     console.log('URL token:', urlToken);

//     if (urlToken) {
//       // 保存到 localStorage
//       localStorage.setItem('recoveryToken', urlToken);
//       setRecoveryToken(urlToken);
//       console.log('Token saved:', urlToken);
//     } else {
//       // 如果 URL 中没有 token，尝试从 localStorage 获取
//       const savedToken = localStorage.getItem('recoveryToken');
//       console.log('Saved token:', savedToken);
//       if (savedToken) {
//         setRecoveryToken(savedToken);
//       }
//     }
//   }, [searchParams]);

//   const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
//     event.preventDefault();
//     setError(null);

//     if (newPassword !== confirmPassword) {
//       setError("Passwords don't match");
//       return;
//     }

//     if (newPassword.length < 8) {
//       setError('Password must be at least 8 characters long');
//       return;
//     }

//     setIsLoading(true);

//     try {
//       // 使用保存的 recovery token
//       const savedRecoveryToken = recoveryToken;
//       console.log('Using recovery token:', savedRecoveryToken);

//       // 从 URL hash 获取 access token 和 refresh token
//       const hash = window.location.hash.substring(1);
//       const hashParams = new URLSearchParams(hash);

//       const accessToken = hashParams.get('access_token');
//       const refreshToken = hashParams.get('refresh_token');
//       const type = hashParams.get('type');

//       // Debug: 打印获取到的所有参数
//       console.log('All tokens:', {
//         recoveryToken: savedRecoveryToken,
//         accessToken,
//         refreshToken,
//         type,
//       });

//       // 验证所有必要的 token 是否存在
//       if (!savedRecoveryToken || !accessToken || !refreshToken) {
//         console.error('Missing required tokens:', {
//           recoveryToken: savedRecoveryToken,
//           accessToken,
//           refreshToken,
//         });
//         throw new Error(
//           'Invalid or expired password reset link. Please request a new password reset email.'
//         );
//       }

//       const response = await fetch('/api/py/auth/update-password', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           recovery_token: savedRecoveryToken,
//           access_token: accessToken,
//           refresh_token: refreshToken,
//           new_password: newPassword,
//         }),
//       });

//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.detail || 'Failed to update password');
//       }

//       const data = await response.json();

//       // 成功后清除保存的 token
//       localStorage.removeItem('recoveryToken');

//       toast({
//         title: 'Success',
//         description:
//           data.message || 'Your password has been updated successfully',
//       });

//       router.push('/login');
//     } catch (error: any) {
//       console.error('Password update error:', error);
//       const errorMessage =
//         error.message || 'An error occurred while updating password';
//       setError(errorMessage);
//       toast({
//         variant: 'destructive',
//         title: 'Error',
//         description: errorMessage,
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center">
//       <Card className="w-full max-w-md">
//         <CardHeader>
//           <CardTitle className="text-2xl text-center">
//             Set New Password
//           </CardTitle>
//           <CardDescription className="text-center">
//             Please enter your new password
//           </CardDescription>
//         </CardHeader>
//         <CardContent>
//           <form onSubmit={handleSubmit} className="space-y-4">
//             {error && (
//               <Alert variant="destructive">
//                 <AlertDescription>{error}</AlertDescription>
//               </Alert>
//             )}

//             <div className="space-y-2">
//               <Label htmlFor="new-password">New Password</Label>
//               <div className="relative">
//                 <Input
//                   id="new-password"
//                   type={showPassword ? 'text' : 'password'}
//                   value={newPassword}
//                   onChange={(e) => setNewPassword(e.target.value)}
//                   required
//                   disabled={isLoading}
//                   placeholder="Enter your new password"
//                 />
//                 <Button
//                   type="button"
//                   variant="ghost"
//                   size="icon"
//                   className="absolute right-2 top-1/2 -translate-y-1/2"
//                   onClick={() => setShowPassword(!showPassword)}
//                 >
//                   {showPassword ? (
//                     <EyeOff className="h-4 w-4" />
//                   ) : (
//                     <Eye className="h-4 w-4" />
//                   )}
//                 </Button>
//               </div>
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="confirm-password">Confirm Password</Label>
//               <div className="relative">
//                 <Input
//                   id="confirm-password"
//                   type={showConfirmPassword ? 'text' : 'password'}
//                   value={confirmPassword}
//                   onChange={(e) => setConfirmPassword(e.target.value)}
//                   required
//                   disabled={isLoading}
//                   placeholder="Confirm your new password"
//                 />
//                 <Button
//                   type="button"
//                   variant="ghost"
//                   size="icon"
//                   className="absolute right-2 top-1/2 -translate-y-1/2"
//                   onClick={() => setShowConfirmPassword(!showConfirmPassword)}
//                 >
//                   {showConfirmPassword ? (
//                     <EyeOff className="h-4 w-4" />
//                   ) : (
//                     <Eye className="h-4 w-4" />
//                   )}
//                 </Button>
//               </div>
//             </div>

//             <Button type="submit" className="w-full" disabled={isLoading}>
//               {isLoading ? 'Updating...' : 'Update Password'}
//             </Button>

//             <div className="text-center text-sm">
//               <Link href="/login" className="text-primary hover:underline">
//                 Back to login
//               </Link>
//             </div>
//           </form>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { useToast } from '@/app/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';

export function NewPasswordForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      // 从 URL hash 获取 access token 和 refresh token
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);

      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      // 验证所有必要的 token 是否存在
      if (!accessToken || !refreshToken) {
        throw new Error(
          'Invalid or expired password reset link. Please request a new password reset email.'
        );
      }

      // 调用后端 API 更新密码
      const response = await fetch('/api/py/auth/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken,
          new_password: newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update password');
      }

      const data = await response.json();

      toast({
        title: 'Success',
        description:
          data.message || 'Your password has been updated successfully',
      });

      router.push('/login');
    } catch (error: any) {
      console.error('Password update error:', error);
      const errorMessage =
        error.message || 'An error occurred while updating password';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Set New Password
          </CardTitle>
          <CardDescription className="text-center">
            Please enter your new password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder="Enter your new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
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
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder="Confirm your new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
              {isLoading ? 'Updating...' : 'Update Password'}
            </Button>

            <div className="text-center text-sm">
              <Link href="/login" className="text-primary hover:underline">
                Back to login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
