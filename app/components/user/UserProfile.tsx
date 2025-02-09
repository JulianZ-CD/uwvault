'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/app/components/ui/form';
import { Input } from '@/app/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/app/hooks/use-toast';
import { Label } from '@/app/components/ui/label';
import { useAuth } from '@/app/hooks/useAuth';
import { useUser } from '@/app/components/user/UserProvider';

const profileFormSchema = z.object({
  username: z
    .string()
    .min(3, { message: 'Username must be at least 3 characters' })
    .max(20, { message: 'Username must not be longer than 20 characters' }),
  email: z.string().email({ message: 'Invalid email address' }),
});

// type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface UserProfileProps {
  user: any;
}

export function UserProfile({ user }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const { updateProfile, resetPassword } = useUser();
  const { getCurrentUser } = useAuth();
  const { toast } = useToast();

  const handleUpdateUsername = async () => {
    try {
      await updateProfile({ new_username: newUsername });
      await getCurrentUser(); // refresh user info
      setIsEditing(false);
      toast({
        title: 'Success',
        description: 'Username updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update username',
        variant: 'destructive',
      });
    }
  };

  const handleResetPassword = async () => {
    try {
      console.log('Current user email:', user?.email);
      await resetPassword(user?.email || '');
      toast({
        title: 'Success',
        description: 'Password reset email has been sent to your email address',
      });
    } catch (error) {
      console.error('Reset password error:', error);
      toast({
        title: 'Error',
        description: 'Failed to send reset password email',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Label>Username</Label>
            <div className="text-sm">
              {isEditing ? (
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="max-w-[240px]"
                />
              ) : (
                <div className="text-muted-foreground">{user?.username}</div>
              )}
            </div>
          </div>
          {isEditing ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setNewUsername(user?.username || '');
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateUsername}>Save</Button>
            </div>
          ) : (
            <Button type="button" onClick={() => setIsEditing(true)}>
              Edit Username
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <Label>Email</Label>
          <div className="text-sm text-muted-foreground">{user?.email}</div>
        </div>

        <div className="space-y-2">
          <Label>Role</Label>
          <div className="text-sm text-muted-foreground capitalize">
            {user?.role || 'user'}
          </div>
        </div>

        <div className="space-y-2">
          <Label>User ID</Label>
          <div className="text-sm text-muted-foreground font-mono">
            {user?.id}
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-medium mb-4">Security</h3>
        <Button variant="outline" onClick={handleResetPassword}>
          Change Password
        </Button>
      </div>
    </div>
  );
}
