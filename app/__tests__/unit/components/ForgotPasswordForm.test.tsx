import '@/app/__tests__/mocks/mockRouter';
import { renderWithQuery } from '@/app/__tests__/utils/test-query-utils';
import userEvent from '@testing-library/user-event';
import { ForgotPasswordForm } from '@/app/components/auth/ForgotPasswordForm';
import { useUser } from '@/app/components/user/UserProvider';
import { mockToast } from '@/app/__tests__/mocks/mockRouter';
import { screen, waitFor } from '@testing-library/react';

// 创建一个持久的 mock 函数
const mockResetPassword = jest.fn();

// Mock useUser hook
jest.mock('@/app/components/user/UserProvider', () => ({
  useUser: () => ({
    resetPassword: mockResetPassword,
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
    mockResetPassword.mockRejectedValueOnce(new Error(errorMessage));

    renderWithQuery(<ForgotPasswordForm />);

    // 验证初始状态
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const submitButton = screen.getByText(
      /send reset link/i
    ) as HTMLButtonElement;
    expect(emailInput).toBeInTheDocument();
    expect(submitButton).toBeInTheDocument();
    expect(submitButton.disabled).toBe(false);

    // 输入邮箱
    await userEvent.type(emailInput, 'invalid-email');
    expect(emailInput.value).toBe('invalid-email');

    // 直接触发表单提交事件
    const form = emailInput.closest('form');
    expect(form).toBeInTheDocument();

    // 使用原生的表单提交事件
    await userEvent.click(submitButton);
    form?.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );

    // 等待 resetPassword 被调用
    await waitFor(
      () => {
        expect(mockResetPassword).toHaveBeenCalledWith('invalid-email');
      },
      { timeout: 1000 }
    );

    // 验证错误状态
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
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
