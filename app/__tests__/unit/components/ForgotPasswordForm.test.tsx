import '@/app/__tests__/mocks/mockRouter';
import { renderWithQuery } from '@/app/__tests__/utils/test-query-utils';
import userEvent from '@testing-library/user-event';
import { ForgotPasswordForm } from '@/app/components/auth/ForgotPasswordForm';
import { useUser } from '@/app/components/user/UserProvider';
import { mockToast } from '@/app/__tests__/mocks/mockRouter';
import { screen, waitFor } from '@testing-library/react';

// Mock useUser 钩子
jest.mock('@/app/components/user/UserProvider', () => ({
  useUser: () => ({
    resetPassword: jest.fn(),
  }),
}));

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { mockRouter } = require('@/app/__tests__/mocks/mockRouter');
    mockRouter.push.mockReset();
  });

  it('成功提交表单并显示成功状态', async () => {
    // 模拟成功的 API 调用
    (useUser().resetPassword as jest.Mock).mockResolvedValue(true);

    renderWithQuery(<ForgotPasswordForm />);

    // 填写表单
    const emailInput = screen.getByLabelText('Email');
    await userEvent.type(emailInput, 'test@example.com');

    // 提交表单
    const submitButton = screen.getByRole('button', {
      name: /Send Reset Link/i,
    });
    await userEvent.click(submitButton);

    // 验证加载状态
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('Sending...');

    // 等待异步操作完成
    await waitFor(() => {
      // 验证成功状态
      expect(
        screen.getByText(/if an account exists with this email address/i)
      ).toBeInTheDocument();
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Password reset email has been sent to your email address',
      });
    });
  });

  it('处理表单提交失败的情况', async () => {
    // 模拟失败的 API 调用
    const errorMessage = 'Invalid email address';
    (useUser().resetPassword as jest.Mock).mockRejectedValue(
      new Error(errorMessage)
    );

    renderWithQuery(<ForgotPasswordForm />);

    // 填写表单
    const emailInput = screen.getByLabelText('Email');
    await userEvent.type(emailInput, 'invalid-email');

    // 提交表单
    const submitButton = screen.getByRole('button', {
      name: /Send Reset Link/i,
    });
    await userEvent.click(submitButton);

    // 等待错误显示
    await waitFor(() => {
      expect(
        screen.getByText(
          (_, element) =>
            element?.textContent?.startsWith(errorMessage) ?? false
        )
      ).toBeInTheDocument();
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    });
  });

  it('验证必填字段', async () => {
    renderWithQuery(<ForgotPasswordForm />);

    // 直接提交空表单
    const submitButton = screen.getByRole('button', {
      name: /Send Reset Link/i,
    });
    await userEvent.click(submitButton);

    // 验证必填提示
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
  });
});
