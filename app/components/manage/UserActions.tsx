'use client';

import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Button } from '@/app/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { useUserActions } from './useUserActions';

interface UserActionsProps {
  user: {
    id: string;
    email: string;
    role?: string;
    username?: string;
  };
  currentUser: {
    id: string;
    email: string;
    role?: string;
  } | null;
  onActionComplete: () => void;
}

export function UserActions({
  user,
  currentUser,
  onActionComplete,
}: UserActionsProps) {
  const { setUserRole, deleteUser } = useUserActions();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const isSelfAction = currentUser?.id === user.id;

  if (isSelfAction) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        title="Cannot modify your own account"
      >
        Actions
      </Button>
    );
  }

  const handleRoleChange = async (newRole: string) => {
    const success = await setUserRole(user.id, newRole);
    if (success) {
      onActionComplete();
    }
  };

  const handleDelete = async () => {
    const success = await deleteUser(user.id);
    if (success) {
      setIsDeleteDialogOpen(false);
      setIsDropdownOpen(false);
      onActionComplete();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            {user.role !== 'admin' && (
              <DropdownMenuItem onClick={() => handleRoleChange('admin')}>
                Make Admin
              </DropdownMenuItem>
            )}
            {user.role !== 'user' && (
              <DropdownMenuItem onClick={() => handleRoleChange('user')}>
                Make User
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                setIsDeleteDialogOpen(true);
                setIsDropdownOpen(false);
              }}
            >
              Delete User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              user account and remove their data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
