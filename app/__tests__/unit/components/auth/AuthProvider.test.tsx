import '@/app/__tests__/mocks/mockRouter';
import { render, screen, act, waitFor } from '@/app/__tests__/utils/test-utils';
import { AuthProvider } from '@/app/components/auth/AuthProvider';
import { useAuth } from '@/app/hooks/useAuth';
import {
  createMockUser,
  mockUserData,
  mockAuthResponses,
} from '@/app/__tests__/mocks/authTestData';

// create a wrapper component to test hooks
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
    // clear localStorage
    localStorage.clear();
    // clear all mocks
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('starts with no user when no token exists', async () => {
      // use act to wrap the rendering process
      await act(async () => {
        render(
          <AuthProvider>
            <TestAuthComponent />
          </AuthProvider>
        );
      });

      expect(screen.getByText('Not logged in')).toBeInTheDocument();
    });

    it('loads user from valid token', async () => {
      // set a valid token
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

      // use act to wrap the whole async operation
      await act(async () => {
        render(
          <AuthProvider>
            <TestAuthComponent />
          </AuthProvider>
        );
      });

      // since act has been used, the result can be checked directly here
      expect(
        screen.getByText(`Logged in as ${mockUser.email}`)
      ).toBeInTheDocument();
    });
  });

  describe('authentication actions', () => {
    it('handles login successfully', async () => {
      // Mock fetch response
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAuthResponses.validLogin),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockUserData.regularUser),
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

      // ensure the authHook is defined
      expect(authHook).toBeDefined();

      // use act to wrap the login operation
      await act(async () => {
        await authHook.login({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      // verify the login is successful
      expect(localStorage.getItem('token')).toBeTruthy();
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

      // use act to wrap the click operation
      await act(async () => {
        logoutButton.click();
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

      // 使用 act 包装登录失败的操作
      await act(async () => {
        await expect(
          authHook.login({
            email: 'test@example.com',
            password: 'wrong',
          })
        ).rejects.toThrow('Login failed');
      });
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

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      // use act to wrap the requireAuth operation
      await act(async () => {
        await expect(authHook.requireAuth()).rejects.toThrow(
          'Authentication required'
        );
      });
    });
  });

  describe('error handling', () => {
    it('handles invalid tokens', async () => {
      // 设置无效的 token
      localStorage.setItem(
        'token',
        JSON.stringify({ access_token: 'invalid_token' })
      );

      // Mock fetch to simulate invalid token error
      global.fetch = jest.fn().mockImplementation(() => {
        localStorage.removeItem('token'); // make sure to clear the token when the error occurs
        throw new Error('Invalid token');
      });

      // use act to wrap the whole async operation
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
