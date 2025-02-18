import '@/app/__tests__/mocks/mockRouter';
import { renderWithQuery } from '@/app/__tests__/utils/test-query-utils';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/app/components/auth/LoginForm';
import { useAuth } from '@/app/hooks/useAuth';
import { mockToast, mockRouter } from '@/app/__tests__/mocks/mockRouter';
import { screen, waitFor } from '@testing-library/react';

// Mock fetch with proper Response type
const mockFetch = jest.fn(() =>
  Promise.resolve(
    new Response(JSON.stringify({ session: { access_token: 'fake-token' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  )
);
global.fetch = mockFetch as jest.Mock;

// Mock getCurrentUser
const mockGetCurrentUser = jest.fn();
jest.mock('@/app/hooks/useAuth', () => ({
  useAuth: () => ({
    getCurrentUser: mockGetCurrentUser,
  }),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 设置更详细的 console.error，但不输出 DOM
    const originalError = console.error;
    console.error = (...args) => {
      if (!args[0].includes('Warning: An update to')) {
        originalError(...args);
      }
    };
  });

  it('成功登录并重定向到首页', async () => {
    const user = userEvent.setup();
    renderWithQuery(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(
      /password/i
    ) as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /login/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/py/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Welcome back!',
        description: 'Successfully signed in to your account.',
      });
    });
  });

  it('处理登录失败的情况', async () => {
    // Mock 失败响应
    mockFetch.mockImplementationOnce(() =>
      Promise.reject(new Error('Invalid credentials'))
    );

    const user = userEvent.setup();
    renderWithQuery(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(
      /password/i
    ) as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /login/i });

    await user.type(emailInput, 'wrong@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Sign in failed',
        description:
          "Please check your email and password, or create a new account if you haven't registered.",
      });
    });
  });

  it('测试密码显示切换功能', async () => {
    const user = userEvent.setup();

    renderWithQuery(<LoginForm />);

    const passwordInput = screen.getByLabelText(
      /password/i
    ) as HTMLInputElement;
    const toggleButton = screen.getByRole('button', {
      name: '', // 按钮没有文本，只有图标
    });

    expect(passwordInput.type).toBe('password');

    await user.click(toggleButton);
    expect(passwordInput.type).toBe('text');

    await user.click(toggleButton);
    expect(passwordInput.type).toBe('password');
  });
});
