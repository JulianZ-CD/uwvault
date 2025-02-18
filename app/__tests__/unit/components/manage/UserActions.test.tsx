import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithQuery } from '@/app/__tests__/utils/test-query-utils';
import { UserActions } from '@/app/components/manage/UserActions';
import { mockToast } from '@/app/__tests__/mocks/mockRouter';

// Mock useUserActions hook
const mockSetUserRole = jest.fn();
const mockDeleteUser = jest.fn();

jest.mock('@/app/components/manage/useUserActions', () => ({
  useUserActions: () => ({
    setUserRole: mockSetUserRole,
    deleteUser: mockDeleteUser,
  }),
}));

describe('UserActions', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    username: 'testuser',
    role: 'user',
    created_at: '2024-01-01',
  };

  const mockCurrentUser = {
    id: '2',
    email: 'admin@example.com',
    username: 'admin',
    role: 'admin',
    created_at: '2024-01-01',
  };

  const mockOnActionComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('禁用当前用户的操作按钮', () => {
    // 当前用户试图操作自己的账户
    renderWithQuery(
      <UserActions
        user={{ ...mockUser, id: mockCurrentUser.id }}
        currentUser={mockCurrentUser}
        onActionComplete={mockOnActionComplete}
      />
    );

    const actionsButton = screen.getByRole('button', { name: /actions/i });
    expect(actionsButton).toBeDisabled();
    expect(actionsButton).toHaveAttribute(
      'title',
      'Cannot modify your own account'
    );
  });

  it('成功将用户角色修改为管理员', async () => {
    mockSetUserRole.mockResolvedValueOnce(true);
    const user = userEvent.setup();

    renderWithQuery(
      <UserActions
        user={mockUser}
        currentUser={mockCurrentUser}
        onActionComplete={mockOnActionComplete}
      />
    );

    // 打开下拉菜单
    await user.click(screen.getByRole('button', { name: /actions/i }));

    // 点击 "Make Admin" 选项
    await user.click(screen.getByText(/make admin/i));

    // 验证调用
    expect(mockSetUserRole).toHaveBeenCalledWith(mockUser.id, 'admin');
    expect(mockOnActionComplete).toHaveBeenCalled();
  });

  it('成功将管理员角色修改为普通用户', async () => {
    mockSetUserRole.mockResolvedValueOnce(true);
    const user = userEvent.setup();

    renderWithQuery(
      <UserActions
        user={{ ...mockUser, role: 'admin' }}
        currentUser={mockCurrentUser}
        onActionComplete={mockOnActionComplete}
      />
    );

    // 打开下拉菜单
    await user.click(screen.getByRole('button', { name: /actions/i }));

    // 点击 "Make User" 选项
    await user.click(screen.getByText(/make user/i));

    // 验证调用
    expect(mockSetUserRole).toHaveBeenCalledWith(mockUser.id, 'user');
    expect(mockOnActionComplete).toHaveBeenCalled();
  });

  it('成功删除用户', async () => {
    mockDeleteUser.mockResolvedValueOnce(true);
    const user = userEvent.setup();

    renderWithQuery(
      <UserActions
        user={mockUser}
        currentUser={mockCurrentUser}
        onActionComplete={mockOnActionComplete}
      />
    );

    // 打开下拉菜单
    await user.click(screen.getByRole('button', { name: /actions/i }));

    // 点击 "Delete User" 选项
    await user.click(screen.getByText(/delete user/i));

    // 确认删除对话框应该显示
    expect(
      screen.getByText(/this action cannot be undone/i)
    ).toBeInTheDocument();

    // 点击确认删除按钮
    await user.click(screen.getByRole('button', { name: /delete/i }));

    // 验证调用
    expect(mockDeleteUser).toHaveBeenCalledWith(mockUser.id);
    expect(mockOnActionComplete).toHaveBeenCalled();
  });

  it('取消删除用户操作', async () => {
    const user = userEvent.setup();

    renderWithQuery(
      <UserActions
        user={mockUser}
        currentUser={mockCurrentUser}
        onActionComplete={mockOnActionComplete}
      />
    );

    // 打开下拉菜单
    await user.click(screen.getByRole('button', { name: /actions/i }));

    // 点击 "Delete User" 选项
    await user.click(screen.getByText(/delete user/i));

    // 点击取消按钮
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    // 验证 deleteUser 没有被调用
    expect(mockDeleteUser).not.toHaveBeenCalled();
    expect(mockOnActionComplete).not.toHaveBeenCalled();
  });

  it('角色修改失败时不调用 onActionComplete', async () => {
    mockSetUserRole.mockResolvedValueOnce(false);
    const user = userEvent.setup();

    renderWithQuery(
      <UserActions
        user={mockUser}
        currentUser={mockCurrentUser}
        onActionComplete={mockOnActionComplete}
      />
    );

    // 打开下拉菜单
    await user.click(screen.getByRole('button', { name: /actions/i }));

    // 点击 "Make Admin" 选项
    await user.click(screen.getByText(/make admin/i));

    // 验证调用
    expect(mockSetUserRole).toHaveBeenCalledWith(mockUser.id, 'admin');
    expect(mockOnActionComplete).not.toHaveBeenCalled();
  });

  it('删除用户失败时不调用 onActionComplete', async () => {
    mockDeleteUser.mockResolvedValueOnce(false);
    const user = userEvent.setup();

    renderWithQuery(
      <UserActions
        user={mockUser}
        currentUser={mockCurrentUser}
        onActionComplete={mockOnActionComplete}
      />
    );

    // 打开下拉菜单
    await user.click(screen.getByRole('button', { name: /actions/i }));

    // 点击 "Delete User" 选项
    await user.click(screen.getByText(/delete user/i));

    // 点击确认删除按钮
    await user.click(screen.getByRole('button', { name: /delete/i }));

    // 验证调用
    expect(mockDeleteUser).toHaveBeenCalledWith(mockUser.id);
    expect(mockOnActionComplete).not.toHaveBeenCalled();
  });

  it('下拉菜单显示正确的选项', async () => {
    const user = userEvent.setup();

    renderWithQuery(
      <UserActions
        user={mockUser}
        currentUser={mockCurrentUser}
        onActionComplete={mockOnActionComplete}
      />
    );

    // 打开下拉菜单
    await user.click(screen.getByRole('button', { name: /actions/i }));

    // 验证菜单选项
    expect(screen.getByText(/make admin/i)).toBeInTheDocument();
    expect(screen.queryByText(/make user/i)).not.toBeInTheDocument();
    expect(screen.getByText(/delete user/i)).toBeInTheDocument();
  });
});
