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

const profileFormSchema = z.object({
  username: z
    .string()
    .min(3, { message: 'Username must be at least 3 characters' })
    .max(20, { message: 'Username must not be longer than 20 characters' }),
  email: z.string().email({ message: 'Invalid email address' }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface UserProfileProps {
  user: any; // 根据你的用户类型定义
}

export function UserProfile({ user }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: user?.username || '',
      email: user?.email || '',
    },
  });

  async function onSubmit(data: ProfileFormValues) {
    try {
      // 这里添加更新用户信息的逻辑
      console.log('Form submitted:', data);
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Label>Username</Label>
            <div className="text-sm">
              {isEditing ? (
                <Input
                  value={user?.username || ''}
                  onChange={(e) => {
                    // 处理用户名更改
                  }}
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
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
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
        <Button variant="outline">Change Password</Button>
      </div>
    </div>
  );
}
