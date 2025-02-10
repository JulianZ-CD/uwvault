import { useToast } from '@/app/hooks/use-toast';

export const useUserActions = () => {
  const { toast } = useToast();

  const setUserRole = async (userId: string, newRole: string) => {
    try {
      const tokenStr = localStorage.getItem('token');
      if (!tokenStr) return false;

      const tokenData = JSON.parse(tokenStr);
      const response = await fetch(`/api/py/auth/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenData.access_token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user role');
      }

      toast({
        title: 'Success',
        description: `User role updated to ${newRole} successfully`,
      });
      return true;
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update user role',
      });
      return false;
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const tokenStr = localStorage.getItem('token');
      if (!tokenStr) return false;

      const tokenData = JSON.parse(tokenStr);
      const response = await fetch(`/api/py/auth/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete user',
      });
      return false;
    }
  };

  return {
    setUserRole,
    deleteUser,
  };
};
