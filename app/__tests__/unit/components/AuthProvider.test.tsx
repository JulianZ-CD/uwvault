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
      let authContext: any; // 添加类型声明

      function TestHookComponent() {
        authContext = useAuth();
        return null;
      }

      await act(async () => {
        render(
          <AuthProvider>
            <TestHookComponent />
            <TestAuthComponent />
          </AuthProvider>
        );
      });

      // 确保 authContext 已定义
      expect(authContext).toBeDefined();

      await authContext.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(
        screen.getByText(`Logged in as ${mockUser.email}`)
      ).toBeInTheDocument();
    });

    it('handles logout successfully', async () => {
      // 设置初始登录状态
      localStorage.setItem(
        'token',
        JSON.stringify({ access_token: 'valid_token' })
      );

      let authHook: any;
      const TestComponent = () => {
        authHook = useAuth();
        return authHook.user ? (
          <button onClick={authHook.logout}>Logout</button>
        ) : null;
      };

      await act(async () => {
        const { user } = render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        const logoutButton = screen.getByRole('button', { name: /logout/i });
        await user.click(logoutButton);
      });

      expect(localStorage.getItem('token')).toBeNull();
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
    it('handles login failure', async () => {
      global.fetch = jest.fn().mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 401,
        })
      );

      const auth = useAuth();
      await expect(
        auth.login({
          email: 'test@example.com',
          password: 'wrong',
        })
      ).rejects.toThrow('Login failed');
    });

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
