import { screen, waitFor } from '@testing-library/react';
import { renderWithAuthProviders } from '../../utils/test-auth-utils';
import LoginPage from '@/app/(auth)/login/page';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import '@/app/__tests__/mocks/mockRouter';

// Mock useAuth hook
const mockGetCurrentUser = jest.fn();
jest.mock('@/app/hooks/useAuth', () => ({
  useAuth: () => ({
    getCurrentUser: mockGetCurrentUser,
    isAuthenticated: false,
    user: null,
  }),
}));

// Mock localStorage
const mockSetItem = jest.fn();
Object.defineProperty(window, 'localStorage', {
  value: {
    setItem: mockSetItem,
  },
  writable: true,
});

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    server.resetHandlers();
  });

  describe('initial render', () => {
    it('renders login form', () => {
      renderWithAuthProviders(<LoginPage />);

      // 检查标题
      expect(screen.getByText(/login/i)).toBeInTheDocument();
      // 检查输入框
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      // 检查按钮
      expect(
        screen.getByRole('button', { name: /login/i })
      ).toBeInTheDocument();
      // 检查链接
      expect(screen.getByText(/register here/i)).toBeInTheDocument();
      expect(screen.getByText(/reset it/i)).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('submits credentials successfully', async () => {
      server.use(
        http.post('/api/py/auth/login', () => {
          return new HttpResponse(
            JSON.stringify({
              session: { access_token: 'fake-token' },
            }),
            { status: 200 }
          );
        })
      );

      const { user } = renderWithAuthProviders(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(mockSetItem).toHaveBeenCalledWith(
          'token',
          JSON.stringify({ access_token: 'fake-token' })
        );
      });
    });

    it('handles login error', async () => {
      server.use(
        http.post('/api/py/auth/login', () => {
          return new HttpResponse(
            JSON.stringify({
              message: 'Invalid credentials',
            }),
            { status: 401 }
          );
        })
      );

      const { user } = renderWithAuthProviders(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/sign in failed/i);
      });
    });
  });

  describe('validation', () => {
    it('shows browser validation when fields are empty', async () => {
      const { user } = renderWithAuthProviders(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      const passwordInput = screen.getByLabelText(
        /password/i
      ) as HTMLInputElement;

      await user.click(screen.getByRole('button', { name: /login/i }));

      expect(emailInput).toBeInvalid();
      expect(emailInput).toBeRequired();
      expect(passwordInput).toBeRequired();
    });

    it('shows browser validation when email format is invalid', async () => {
      const { user } = renderWithAuthProviders(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      await user.type(emailInput, 'invalid-email');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /login/i }));

      expect(emailInput).toBeInvalid();
    });
  });

  describe('password visibility toggle', () => {
    it('toggles password visibility', async () => {
      const { user } = renderWithAuthProviders(<LoginPage />);

      const passwordInput = screen.getByLabelText(/password/i);
      const toggleButton = screen.getByRole('button', {
        name: '',
      });

      expect(passwordInput).toHaveAttribute('type', 'password');

      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');

      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('navigation links', () => {
    it('renders registration and password reset links', () => {
      renderWithAuthProviders(<LoginPage />);

      expect(
        screen.getByRole('link', { name: /register here/i })
      ).toHaveAttribute('href', '/register');
      expect(screen.getByRole('link', { name: /reset it/i })).toHaveAttribute(
        'href',
        '/forgot-password'
      );
    });
  });
});
