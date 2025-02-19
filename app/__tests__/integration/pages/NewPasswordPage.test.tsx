import { screen, waitFor } from '@testing-library/react';
import { renderWithAuthProviders } from '../../utils/test-auth-utils';
import NewPasswordPage from '@/app/(auth)/new-password/page';
import '@/app/__tests__/mocks/mockRouter';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';

// Mock window.location.hash
const mockLocation = {
  hash: '#access_token=fake-access-token&refresh_token=fake-refresh-token',
};
// @ts-ignore
delete window.location;
// @ts-ignore
window.location = mockLocation;

describe('NewPasswordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    server.resetHandlers();
  });

  describe('initial render', () => {
    it('renders new password form', () => {
      renderWithAuthProviders(<NewPasswordPage />);

      // 检查输入字段
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();

      // 检查提交按钮
      expect(
        screen.getByRole('button', { name: /update password/i })
      ).toBeInTheDocument();
    });
  });

  describe('password update functionality', () => {
    it('successfully updates password with valid inputs', async () => {
      // Mock successful API response
      server.use(
        http.post('/api/py/auth/update-password', () => {
          return HttpResponse.json({ message: 'Password updated' });
        })
      );

      const { user } = renderWithAuthProviders(<NewPasswordPage />);

      // 填写表单
      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', {
        name: /update password/i,
      });

      await user.type(newPasswordInput, 'newPassword123');
      await user.type(confirmPasswordInput, 'newPassword123');
      await user.click(submitButton);

      // 验证请求是否发送
      await waitFor(() => {
        expect(window.fetch).toHaveBeenCalledWith(
          '/api/py/auth/update-password',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_token: 'fake-access-token',
              refresh_token: 'fake-refresh-token',
              new_password: 'newPassword123',
            }),
          })
        );
      });
    });

    it('prevents submission with mismatched passwords', async () => {
      const { user } = renderWithAuthProviders(<NewPasswordPage />);

      // 填写不匹配的密码
      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', {
        name: /update password/i,
      });

      await user.type(newPasswordInput, 'password123');
      await user.type(confirmPasswordInput, 'differentPassword');
      await user.click(submitButton);

      // 验证表单是否仍然存在（未提交）
      expect(
        screen.getByRole('button', { name: /update password/i })
      ).toBeInTheDocument();

      // 验证输入框的值是否保持不变
      expect(newPasswordInput).toHaveValue('password123');
      expect(confirmPasswordInput).toHaveValue('differentPassword');
    });

    it('prevents submission with short password', async () => {
      const { user } = renderWithAuthProviders(<NewPasswordPage />);

      // 填写太短的密码
      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', {
        name: /update password/i,
      });

      await user.type(newPasswordInput, 'short');
      await user.type(confirmPasswordInput, 'short');
      await user.click(submitButton);

      // 验证表单是否仍然存在（未提交）
      expect(
        screen.getByRole('button', { name: /update password/i })
      ).toBeInTheDocument();

      // 验证输入框的值是否保持不变
      expect(newPasswordInput).toHaveValue('short');
      expect(confirmPasswordInput).toHaveValue('short');
    });
  });

  describe('password visibility toggle', () => {
    it('toggles password visibility', async () => {
      const { user } = renderWithAuthProviders(<NewPasswordPage />);

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const toggleButtons = screen.getAllByRole('button', { name: '' });

      // 检查初始状态
      expect(newPasswordInput).toHaveAttribute('type', 'password');
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');

      // 切换新密码可见性
      await user.click(toggleButtons[0]);
      expect(newPasswordInput).toHaveAttribute('type', 'text');
      await user.click(toggleButtons[0]);
      expect(newPasswordInput).toHaveAttribute('type', 'password');

      // 切换确认密码可见性
      await user.click(toggleButtons[1]);
      expect(confirmPasswordInput).toHaveAttribute('type', 'text');
      await user.click(toggleButtons[1]);
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    });
  });
});
