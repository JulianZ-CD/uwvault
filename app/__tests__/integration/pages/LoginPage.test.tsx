import { screen, waitFor, within } from '@testing-library/react';
import { renderWithAuthProviders } from '../../utils/test-auth-utils';
import LoginPage from '@/app/(auth)/login/page';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import '@/app/__tests__/mocks/mockRouter';
import userEvent from '@testing-library/user-event';
import { metadata } from '@/app/(auth)/login/page';

// Mock useAuth hook
const mockGetCurrentUser = jest.fn();
jest.mock('@/app/hooks/useAuth', () => ({
  useAuth: () => ({
    getCurrentUser: mockGetCurrentUser,
    isAuthenticated: false,
    user: null,
  }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    server.resetHandlers();

    // mock FormData
    const mockFormData = {
      get: jest.fn((key) => {
        const values = {
          email: 'test@example.com',
          password: 'password123',
        };
        return values[key as keyof typeof values] || null;
      }),
    };
    // @ts-ignore
    global.FormData = jest.fn(() => mockFormData);

    // Mock localStorage
    const mockSetItem = jest.fn();
    Object.defineProperty(window, 'localStorage', {
      value: {
        setItem: mockSetItem,
        getItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
  });

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(metadata).toEqual({
        title: 'Login | UWvault',
        description: 'Login to UWvault',
      });
    });
  });

  describe('initial render', () => {
    it('renders login form', () => {
      renderWithAuthProviders(<LoginPage />);

      // check title
      const formContainer = screen.getByRole('main');
      expect(
        within(formContainer).getByText('Login', { selector: 'div.text-2xl' })
      ).toBeInTheDocument();

      // check input fields
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      // check button
      expect(
        screen.getByRole('button', { name: /login/i })
      ).toBeInTheDocument();
      // check links
      expect(screen.getByText(/register here/i)).toBeInTheDocument();
      expect(screen.getByText(/reset it/i)).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('submits credentials successfully', async () => {
      server.use(
        http.post('/api/py/auth/login', () => {
          return HttpResponse.json({
            session: { access_token: 'fake-token' },
          });
        })
      );

      const { user } = renderWithAuthProviders(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith(
          'token',
          JSON.stringify({ access_token: 'fake-token' })
        );
      });
    });

    it('handles login error', async () => {
      server.use(
        http.post('/api/py/auth/login', () => {
          return HttpResponse.json(
            { message: 'Invalid credentials' },
            { status: 401 }
          );
        })
      );

      const { user } = renderWithAuthProviders(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(screen.getByText(/sign in failed/i)).toBeInTheDocument();
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
      renderWithAuthProviders(<LoginPage />);
      const passwordInput = screen.getByLabelText(/password/i);
      const passwordContainer = passwordInput.closest('div'); // 找到最近的父级 div
      const toggleButton = within(passwordContainer!).getByRole('button');

      expect(passwordInput).toHaveAttribute('type', 'password');

      await userEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');

      await userEvent.click(toggleButton);
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
