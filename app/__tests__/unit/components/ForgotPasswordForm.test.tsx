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
  });

  it('成功提交表单并显示成功状态', async () => {
    (useUser().resetPassword as jest.Mock).mockResolvedValue(true);
    renderWithQuery(<ForgotPasswordForm />);

    // 获取表单元素
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByText(/send reset link/i);

    // 填写并提交表单
    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.click(submitButton);

    // 验证 toast 调用
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Password reset email has been sent to your email address',
      });
    });
  });

  it('处理表单提交失败的情况', async () => {
    const errorMessage = 'Invalid email address';
    const resetPasswordMock = jest
      .fn()
      .mockRejectedValue(new Error(errorMessage));

    jest.mock('@/app/components/user/UserProvider', () => ({
      useUser: () => ({
        resetPassword: resetPasswordMock,
      }),
    }));

    renderWithQuery(<ForgotPasswordForm />);

    // 获取表单元素
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByText(/send reset link/i);

    // 填写并提交表单
    await userEvent.type(emailInput, 'invalid-email');
    await userEvent.click(submitButton);

    // 等待 resetPassword 被调用
    await waitFor(() => {
      expect(resetPasswordMock).toHaveBeenCalledWith('invalid-email');
    });

    // 然后验证 toast 调用
    expect(mockToast).toHaveBeenCalledWith({
      variant: 'destructive',
      title: 'Error',
      description: errorMessage,
    });
  });

  it('验证必填字段', async () => {
    renderWithQuery(<ForgotPasswordForm />);

    // 获取表单元素
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByText(/send reset link/i);

    // 直接提交空表单
    await userEvent.click(submitButton);

    // 验证必填提示
    expect(emailInput).toBeInvalid();
    expect(emailInput).toBeRequired();
  });
});
