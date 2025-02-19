import { screen, waitFor, within } from '@testing-library/react';
import { renderWithAuthProviders } from '../../utils/test-auth-utils';
import RegisterPage from '@/app/(auth)/register/page';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import '@/app/__tests__/mocks/mockRouter';
import userEvent from '@testing-library/user-event';

// Mock useAuth hook (如果需要，可以根据实际情况调整)
jest.mock('@/app/hooks/useAuth', () => ({
  useAuth: () => ({
    getCurrentUser: jest.fn(),
    isAuthenticated: false,
    user: null,
  }),
}));

describe('RegisterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    server.resetHandlers();

    // 模拟 FormData
    const mockFormData = {
      get: jest.fn((key) => {
        const values = {
          email: 'test@example.com',
          username: 'testuser',
          password: 'password123',
          confirmPassword: 'password123',
        };
        return values[key as keyof typeof values] || null;
      }),
    };
    // @ts-ignore
    global.FormData = jest.fn(() => mockFormData);
  });

  describe('initial render', () => {
    it('renders register form', () => {
      renderWithAuthProviders(<RegisterPage />);

      // 检查标题
      const formContainer = screen.getByRole('main');
      expect(
        within(formContainer).getByText('Register', {
          selector: 'div.text-2xl',
        })
      ).toBeInTheDocument();

      // 检查输入框
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument(); // 使用正则表达式匹配 "password" 开头的 label
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      // 检查按钮
      expect(
        screen.getByRole('button', { name: /register/i })
      ).toBeInTheDocument();
      // 检查链接
      expect(screen.getByText(/login here/i)).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('submits credentials successfully and dispatches userRegistered event', async () => {
      const dispatchEventSpy = jest.spyOn(window, 'dispatchEvent');

      server.use(
        http.post('/api/py/auth/register', () => {
          return HttpResponse.json({
            user: {
              id: '123',
              email: 'test@example.com',
              user_metadata: { username: 'testuser' },
              role: 'user',
            },
          });
        })
      );

      const { user } = renderWithAuthProviders(<RegisterPage />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(
        screen.getByLabelText(/confirm password/i),
        'password123'
      );
      await user.click(screen.getByRole('button', { name: /register/i }));

      await waitFor(() => {
        expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
        // 你可以进一步检查 CustomEvent 的 detail 属性是否符合预期
        const dispatchedEvent = dispatchEventSpy.mock
          .calls[0][0] as CustomEvent;
        expect(dispatchedEvent.type).toBe('userRegistered');
        expect(dispatchedEvent.detail).toEqual({
          id: '123',
          email: 'test@example.com',
          username: 'testuser',
          role: 'user',
        });
      });
    });

    it('handles registration error', async () => {
      server.use(
        http.post('/api/py/auth/register', () => {
          return HttpResponse.json(
            { detail: 'Registration failed' },
            { status: 400 }
          );
        })
      );

      const { user } = renderWithAuthProviders(<RegisterPage />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(
        screen.getByLabelText(/confirm password/i),
        'password123'
      );
      await user.click(screen.getByRole('button', { name: /register/i }));

      await waitFor(() => {
        expect(screen.getByText(/registration error/i)).toBeInTheDocument();
      });
    });
  });

  describe('validation', () => {
    it('shows validation error for username length', async () => {
      const { user } = renderWithAuthProviders(<RegisterPage />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/username/i), 'ab'); // 用户名太短
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(
        screen.getByLabelText(/confirm password/i),
        'password123'
      );
      await user.click(screen.getByRole('button', { name: /register/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/username must be at least 3 characters/i)
        ).toBeInTheDocument();
      });
    });

    it('shows validation error for password mismatch', async () => {
      const { user } = renderWithAuthProviders(<RegisterPage />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(
        screen.getByLabelText(/confirm password/i),
        'password456'
      ); // 密码不匹配
      await user.click(screen.getByRole('button', { name: /register/i }));

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });
  });

  describe('password visibility toggle', () => {
    it('toggles password and confirm password visibility', async () => {
      renderWithAuthProviders(<RegisterPage />);

      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      const passwordContainer = passwordInput.closest('div');
      const confirmPasswordContainer = confirmPasswordInput.closest('div');

      const passwordToggleButton = within(passwordContainer!).getByRole(
        'button'
      );
      const confirmPasswordToggleButton = within(
        confirmPasswordContainer!
      ).getByRole('button');

      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');

      await userEvent.click(passwordToggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');

      await userEvent.click(confirmPasswordToggleButton);
      expect(confirmPasswordInput).toHaveAttribute('type', 'text');

      await userEvent.click(passwordToggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');

      await userEvent.click(confirmPasswordToggleButton);
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('navigation links', () => {
    it('renders login link', () => {
      renderWithAuthProviders(<RegisterPage />);

      expect(screen.getByRole('link', { name: /login here/i })).toHaveAttribute(
        'href',
        '/login'
      );
    });
  });
});
