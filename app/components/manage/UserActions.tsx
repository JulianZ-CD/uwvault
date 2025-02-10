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
    role: string;
  };
  onActionComplete: () => void;
}

export function UserActions({ user, onActionComplete }: UserActionsProps) {
  const { setUserRole, deleteUser } = useUserActions();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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
      onActionComplete();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
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
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              user account and remove their data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
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
