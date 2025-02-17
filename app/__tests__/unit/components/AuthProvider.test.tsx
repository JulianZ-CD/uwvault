import '@/app/__tests__/mocks/mockRouter';
import { render, screen, act } from '../../utils/test-utils';
import { AuthProvider } from '@/app/components/auth/AuthProvider';
import { useAuth } from '@/app/hooks/useAuth';
import {
  createMockUser,
  mockUserData,
  mockAuthResponses,
} from '@/app/__tests__/mocks/authTestData';

// 创建一个包装组件来测试 hooks
const TestAuthComponent = () => {
  const auth = useAuth();
  return (
    <div>
      {auth.user ? (
        <div>
          <span>Logged in as {auth.user.email}</span>
          <button onClick={auth.logout}>Logout</button>
        </div>
      ) : (
        <span>Not logged in</span>
      )}
    </div>
  );
};

describe('AuthProvider', () => {
  const mockUser = createMockUser({
    id: '1',
    email: 'test@example.com',
    username: 'testuser',
    role: 'user',
  });

  beforeEach(() => {
    // 清除 localStorage
    localStorage.clear();
    // 清除所有 mock
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('starts with no user when no token exists', () => {
      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      expect(screen.getByText('Not logged in')).toBeInTheDocument();
    });

    it('loads user from valid token', async () => {
      // 设置有效的 token
      localStorage.setItem(
        'token',
        JSON.stringify({
          access_token: 'valid_token',
        })
      );

      // Mock fetch response
      global.fetch = jest.fn().mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUser),
        })
      );

      await act(async () => {
        render(
          <AuthProvider>
            <TestAuthComponent />
          </AuthProvider>
        );
      });

      expect(
        screen.getByText(`Logged in as ${mockUser.email}`)
      ).toBeInTheDocument();
    });
  });

  describe('authentication actions', () => {
    it('handles login successfully', async () => {
      // Mock fetch response
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAuthResponses.validLogin),
      });

      let authHook: any;
      const TestComponent = () => {
        authHook = useAuth();
        return null;
      };

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      await act(async () => {
        await authHook.login({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      expect(
        screen.getByText(`Logged in as ${mockUser.email}`)
      ).toBeInTheDocument();
    });

    it('handles logout successfully', async () => {
      localStorage.setItem(
        'token',
        JSON.stringify({ access_token: 'valid_token' })
      );

      // Mock fetch for getCurrentUser
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockUserData.regularUser),
        })
        .mockResolvedValueOnce({
          ok: true,
        });

      await act(async () => {
        render(
          <AuthProvider>
            <TestAuthComponent />
          </AuthProvider>
        );
      });

      const logoutButton = await screen.findByRole('button', {
        name: /logout/i,
      });
      await act(async () => {
        await logoutButton.click();
      });

      expect(localStorage.getItem('token')).toBeNull();
    });

    it('handles login failure', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      let authHook: any;
      const TestComponent = () => {
        authHook = useAuth();
        return null;
      };

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      await expect(
        authHook.login({
          email: 'test@example.com',
          password: 'wrong',
        })
      ).rejects.toThrow('Login failed');
    });
  });

  describe('authorization checks', () => {
    it('identifies admin users correctly', async () => {
      let authHook: any;

      function TestComponent() {
        authHook = useAuth();
        return null;
      }

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      expect(authHook.isAdmin()).toBe(false);
    });

    it('requires authentication for protected routes', async () => {
      let authHook: any;

      function TestComponent() {
        authHook = useAuth();
        return null;
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await expect(authHook.requireAuth()).rejects.toThrow(
        'Authentication required'
      );
    });
  });

  describe('error handling', () => {
    it('handles invalid tokens', async () => {
      localStorage.setItem('token', 'invalid_token');

      await act(async () => {
        render(
          <AuthProvider>
            <TestAuthComponent />
          </AuthProvider>
        );
      });

      expect(screen.getByText('Not logged in')).toBeInTheDocument();
      expect(localStorage.getItem('token')).toBeNull();
    });
  });
});
