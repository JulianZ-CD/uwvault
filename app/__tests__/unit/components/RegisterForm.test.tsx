import '@/app/__tests__/mocks/mockRouter';
import { renderWithQuery } from '@/app/__tests__/utils/test-query-utils';
import userEvent from '@testing-library/user-event';
import { RegisterForm } from '@/app/components/auth/RegisterForm';
import { mockToast, mockRouter } from '@/app/__tests__/mocks/mockRouter';
import { screen, waitFor } from '@testing-library/react';

describe('RegisterForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();

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

  it('成功注册并重定向到登录页面', async () => {
    // 模拟成功的注册响应
    jest.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            user: {
              id: '123',
              email: 'test@example.com',
              user_metadata: { username: 'testuser' },
              role: 'user',
            },
          }),
      } as Response)
    );

    const user = userEvent.setup();
    renderWithQuery(<RegisterForm />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const usernameInput = screen.getByLabelText(
      /username/i
    ) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(
      /^password/i
    ) as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText(
      /confirm password/i
    ) as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /register/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/py/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          origin: expect.any(String),
        },
        body: JSON.stringify({
          email: 'test@example.com',
          username: 'testuser',
          password: 'password123',
        }),
        credentials: 'include',
      });
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Registration successful',
        description: 'Please check your email to verify your account',
      });
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });

    (global.fetch as jest.Mock).mockRestore();
  });

  it('处理注册失败的情况', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ detail: 'Email already registered' }),
      } as Response)
    );

    const user = userEvent.setup();
    renderWithQuery(<RegisterForm />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const usernameInput = screen.getByLabelText(
      /username/i
    ) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(
      /^password/i
    ) as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText(
      /confirm password/i
    ) as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /register/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Registration Error',
        description: 'Email already registered',
      });
    });

    (global.fetch as jest.Mock).mockRestore();
  });

  it('验证密码不匹配的情况', async () => {
    const user = userEvent.setup();
    renderWithQuery(<RegisterForm />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const usernameInput = screen.getByLabelText(
      /username/i
    ) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(
      /^password/i
    ) as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText(
      /confirm password/i
    ) as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /register/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password456');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Passwords do not match',
      });
    });
  });

  it('验证用户名长度限制', async () => {
    const user = userEvent.setup();
    renderWithQuery(<RegisterForm />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const usernameInput = screen.getByLabelText(
      /username/i
    ) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(
      /^password/i
    ) as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText(
      /confirm password/i
    ) as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /register/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(usernameInput, 'ab'); // 用户名太短
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Username must be at least 3 characters',
      });
    });
  });

  it('测试密码显示切换功能', async () => {
    const user = userEvent.setup();
    renderWithQuery(<RegisterForm />);

    const passwordInput = screen.getByLabelText(
      /^password/i
    ) as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText(
      /confirm password/i
    ) as HTMLInputElement;
    const toggleButtons = screen.getAllByRole('button', { name: '' });

    // 测试密码输入框的显示切换
    expect(passwordInput.type).toBe('password');
    await user.click(toggleButtons[0]);
    expect(passwordInput.type).toBe('text');
    await user.click(toggleButtons[0]);
    expect(passwordInput.type).toBe('password');

    // 测试确认密码输入框的显示切换
    expect(confirmPasswordInput.type).toBe('password');
    await user.click(toggleButtons[1]);
    expect(confirmPasswordInput.type).toBe('text');
    await user.click(toggleButtons[1]);
    expect(confirmPasswordInput.type).toBe('password');
  });
});
