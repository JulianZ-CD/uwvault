import { screen, waitFor } from '@testing-library/react';
import { renderWithAuthProviders } from '../../utils/test-auth-utils';
import ProfilePage from '@/app/(user)/profile/page';
import '@/app/__tests__/mocks/mockRouter';
import userEvent from '@testing-library/user-event';
import { useAuth } from '@/app/hooks/useAuth';
import { useUser } from '@/app/components/user/UserProvider';

// Mock useAuth and useUser hooks
jest.mock('@/app/hooks/useAuth');
jest.mock('@/app/components/user/UserProvider');

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  username: 'testuser',
  role: 'user',
};

describe('ProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useAuth hook
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      getCurrentUser: jest.fn().mockResolvedValue(mockUser),
    });

    // Mock useUser hook
    (useUser as jest.Mock).mockReturnValue({
      updateProfile: jest.fn().mockResolvedValue(undefined),
      resetPassword: jest.fn().mockResolvedValue(undefined),
    });
  });

  describe('initial render', () => {
    it('renders profile page with correct layout', () => {
      renderWithAuthProviders(<ProfilePage />);

      // 检查页面标题
      expect(screen.getByText('Profile Settings')).toBeInTheDocument();

      // 检查卡片布局
      expect(screen.getByRole('main')).toHaveClass('container');

      // 检查用户信息是否显示
      expect(screen.getByText(mockUser.username)).toBeInTheDocument();
      expect(screen.getByText(mockUser.email)).toBeInTheDocument();
      expect(screen.getByText(mockUser.role)).toBeInTheDocument();
      expect(screen.getByText(mockUser.id)).toBeInTheDocument();
    });

    it('renders all necessary buttons', () => {
      renderWithAuthProviders(<ProfilePage />);

      expect(
        screen.getByRole('button', { name: 'Edit Username' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Change Password' })
      ).toBeInTheDocument();
    });
  });

  describe('username update functionality', () => {
    it('allows editing and saving username', async () => {
      const { updateProfile } = useUser() as any;
      const { user } = renderWithAuthProviders(<ProfilePage />);

      // 点击编辑按钮
      const editButton = screen.getByRole('button', { name: 'Edit Username' });
      await user.click(editButton);

      // 修改用户名
      const usernameLabel = screen.getByText('Username');
      const usernameInput = usernameLabel.parentElement?.querySelector('input');
      expect(usernameInput).toBeInTheDocument();

      await user.clear(usernameInput!);
      await user.type(usernameInput!, 'newusername');

      // 保存更改
      const saveButton = screen.getByRole('button', { name: 'Save' });
      await user.click(saveButton);

      // 验证更新调用
      await waitFor(() => {
        expect(updateProfile).toHaveBeenCalledWith({
          new_username: 'newusername',
        });
      });
    });

    it('allows canceling username edit', async () => {
      const { user } = renderWithAuthProviders(<ProfilePage />);

      // 点击编辑按钮
      const editButton = screen.getByRole('button', { name: 'Edit Username' });
      await user.click(editButton);

      // 验证进入编辑模式
      const usernameLabel = screen.getByText('Username');
      const usernameInput = usernameLabel.parentElement?.querySelector('input');
      expect(usernameInput).toBeInTheDocument();

      // 点击取消按钮
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      // 验证返回查看模式
      expect(
        screen.queryByRole('textbox', { name: 'Username' })
      ).not.toBeInTheDocument();
      expect(screen.getByText(mockUser.username)).toBeInTheDocument();
    });
  });

  describe('password change functionality', () => {
    it('initiates password reset process', async () => {
      const { resetPassword } = useUser() as any;
      const { user } = renderWithAuthProviders(<ProfilePage />);

      // 点击更改密码按钮
      const resetButton = screen.getByRole('button', {
        name: 'Change Password',
      });
      await user.click(resetButton);

      // 验证密码重置调用
      await waitFor(() => {
        expect(resetPassword).toHaveBeenCalledWith(mockUser.email);
      });
    });
  });

  describe('error handling', () => {
    it('handles username update failure', async () => {
      const { updateProfile } = useUser() as any;
      updateProfile.mockRejectedValueOnce(new Error('Update failed'));

      const { user } = renderWithAuthProviders(<ProfilePage />);

      // 点击编辑按钮
      const editButton = screen.getByRole('button', { name: 'Edit Username' });
      await user.click(editButton);

      // 修改用户名
      const usernameLabel = screen.getByText('Username');
      const usernameInput = usernameLabel.parentElement?.querySelector('input');
      await user.clear(usernameInput!);
      await user.type(usernameInput!, 'newusername');

      // 尝试保存
      const saveButton = screen.getByRole('button', { name: 'Save' });
      await user.click(saveButton);

      // 验证错误处理
      await waitFor(() => {
        expect(updateProfile).toHaveBeenCalledWith({
          new_username: 'newusername',
        });
      });
    });

    it('handles password reset failure', async () => {
      const { resetPassword } = useUser() as any;
      resetPassword.mockRejectedValueOnce(new Error('Reset failed'));

      const { user } = renderWithAuthProviders(<ProfilePage />);

      // 点击更改密码按钮
      const resetButton = screen.getByRole('button', {
        name: 'Change Password',
      });
      await user.click(resetButton);

      // 验证错误处理
      await waitFor(() => {
        expect(resetPassword).toHaveBeenCalledWith(mockUser.email);
      });
    });
  });
});
