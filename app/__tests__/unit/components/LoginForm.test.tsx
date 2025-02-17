import '@/app/__tests__/mocks/mockRouter';
import { renderWithQuery } from '@/app/__tests__/utils/test-query-utils';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/app/components/auth/LoginForm';
import { useAuth } from '@/app/hooks/useAuth';
import { mockToast, mockRouter } from '@/app/__tests__/mocks/mockRouter';
import { screen, waitFor } from '@testing-library/react';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

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
  });

  it('成功登录并重定向到首页', async () => {
    // Mock 成功的登录响应
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          session: {
            access_token: 'fake-token',
          },
        }),
    });

    mockGetCurrentUser.mockResolvedValueOnce(true);

    renderWithQuery(<LoginForm />);

    // 获取表单元素
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(
      /password/i
    ) as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /^login$/i });

    // 填写表单
    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'password123');

    // 提交表单
    const form = screen.getByRole('form');
    await userEvent.click(submitButton);

    // 验证 fetch 调用
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/py/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });
    });

    // 验证 getCurrentUser 被调用
    await waitFor(() => {
      expect(mockGetCurrentUser).toHaveBeenCalled();
    });

    // 验证成功提示
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Welcome back!',
        description: 'Successfully signed in to your account.',
      });
    });

    // 验证路由跳转
    expect(mockRouter.push).toHaveBeenCalledWith('/');
    expect(mockRouter.refresh).toHaveBeenCalled();
  });

  it('处理登录失败的情况', async () => {
    // Mock 失败的登录响应
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: 'Invalid credentials' }),
    });

    renderWithQuery(<LoginForm />);

    // 获取表单元素
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(
      /password/i
    ) as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /^login$/i });

    // 填写表单
    await userEvent.type(emailInput, 'wrong@example.com');
    await userEvent.type(passwordInput, 'wrongpassword');

    // 提交表单
    await userEvent.click(submitButton);

    // 验证错误提示
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Sign in failed',
        description:
          "Please check your email and password, or create a new account if you haven't registered.",
      });
    });

    // 验证没有调用 getCurrentUser
    expect(mockGetCurrentUser).not.toHaveBeenCalled();
    // 验证没有跳转
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('测试密码显示切换功能', async () => {
    renderWithQuery(<LoginForm />);

    // 获取密码输入框和切换按钮
    const passwordInput = screen.getByLabelText(
      /password/i
    ) as HTMLInputElement;
    const toggleButton = screen.getByRole('button', {
      name: /show password/i,
    });

    // 验证初始状态是密码隐藏
    expect(passwordInput.type).toBe('password');

    // 点击切换按钮显示密码
    await userEvent.click(toggleButton);
    expect(passwordInput.type).toBe('text');

    // 再次点击隐藏密码
    await userEvent.click(toggleButton);
    expect(passwordInput.type).toBe('password');
  });
});
