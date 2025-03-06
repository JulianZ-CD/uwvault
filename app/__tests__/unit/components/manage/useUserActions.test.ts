import { renderHook } from '@testing-library/react';
import { useUserActions } from '@/app/manage-users/components/useUserActions';
import { useToast } from '@/app/hooks/use-toast';
import { useAuth } from '@/app/hooks/useAuth';

// Mock hooks
jest.mock('@/app/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

jest.mock('@/app/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
  removeItem: jest.fn(),
  key: jest.fn(),
  length: 0,
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('useUserActions', () => {
  const mockToast = jest.fn();
  const mockCurrentUser = {
    id: 'current-user-id',
    email: 'admin@example.com',
    username: 'admin',
    role: 'admin',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    (useAuth as jest.Mock).mockReturnValue({ user: mockCurrentUser });
    mockFetch.mockImplementation(() => Promise.resolve({ ok: true }));
    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({ access_token: 'mock-token' })
    );
  });

  describe('setUserRole', () => {
    it('should successfully update user role', async () => {
      const { result } = renderHook(() => useUserActions());

      const success = await result.current.setUserRole(
        'other-user-id',
        'admin'
      );

      expect(success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/py/auth/admin/users/other-user-id/role',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token',
          },
          body: JSON.stringify({ role: 'admin' }),
        }
      );
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'User role updated to admin successfully',
      });
    });

    it('should prevent updating own role', async () => {
      const { result } = renderHook(() => useUserActions());

      const success = await result.current.setUserRole(
        'current-user-id',
        'user'
      );

      expect(success).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Error',
        description: 'Cannot modify your own role',
      });
    });

    it('should handle missing token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      const { result } = renderHook(() => useUserActions());

      const success = await result.current.setUserRole(
        'other-user-id',
        'admin'
      );

      expect(success).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle API error', async () => {
      mockFetch.mockImplementation(() =>
        Promise.reject(new Error('API Error'))
      );
      const { result } = renderHook(() => useUserActions());

      const success = await result.current.setUserRole(
        'other-user-id',
        'admin'
      );

      expect(success).toBe(false);
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update user role',
      });
    });

    it('should handle non-ok response', async () => {
      mockFetch.mockImplementation(() => Promise.resolve({ ok: false }));
      const { result } = renderHook(() => useUserActions());

      const success = await result.current.setUserRole(
        'other-user-id',
        'admin'
      );

      expect(success).toBe(false);
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update user role',
      });
    });
  });

  describe('deleteUser', () => {
    it('should successfully delete user', async () => {
      const { result } = renderHook(() => useUserActions());

      const success = await result.current.deleteUser('other-user-id');

      expect(success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/py/auth/admin/users/other-user-id',
        {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer mock-token',
          },
        }
      );
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'User deleted successfully',
      });
    });

    it('should prevent deleting own account', async () => {
      const { result } = renderHook(() => useUserActions());

      const success = await result.current.deleteUser('current-user-id');

      expect(success).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Error',
        description: 'Cannot delete your own account',
      });
    });

    it('should handle missing token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      const { result } = renderHook(() => useUserActions());

      const success = await result.current.deleteUser('other-user-id');

      expect(success).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle API error', async () => {
      mockFetch.mockImplementation(() =>
        Promise.reject(new Error('API Error'))
      );
      const { result } = renderHook(() => useUserActions());

      const success = await result.current.deleteUser('other-user-id');

      expect(success).toBe(false);
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete user',
      });
    });

    it('should handle non-ok response', async () => {
      mockFetch.mockImplementation(() => Promise.resolve({ ok: false }));
      const { result } = renderHook(() => useUserActions());

      const success = await result.current.deleteUser('other-user-id');

      expect(success).toBe(false);
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete user',
      });
    });
  });
});
