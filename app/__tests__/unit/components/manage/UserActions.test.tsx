import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithQuery } from '@/app/__tests__/utils/test-query-utils';
import { UserActions } from '@/app/manage-users/components/UserActions';

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

  it('disable current user actions', () => {
    // current user try to operate own account
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

  it('success change user role to admin', async () => {
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

  it('success change admin role to user', async () => {
    mockSetUserRole.mockResolvedValueOnce(true);
    const user = userEvent.setup();

    renderWithQuery(
      <UserActions
        user={{ ...mockUser, role: 'admin' }}
        currentUser={mockCurrentUser}
        onActionComplete={mockOnActionComplete}
      />
    );

    // open dropdown menu
    await user.click(screen.getByRole('button', { name: /actions/i }));

    // click "Make User" option
    await user.click(screen.getByText(/make user/i));

    // validate call
    expect(mockSetUserRole).toHaveBeenCalledWith(mockUser.id, 'user');
    expect(mockOnActionComplete).toHaveBeenCalled();
  });

  it('success delete user', async () => {
    mockDeleteUser.mockResolvedValueOnce(true);
    const user = userEvent.setup();

    renderWithQuery(
      <UserActions
        user={mockUser}
        currentUser={mockCurrentUser}
        onActionComplete={mockOnActionComplete}
      />
    );

    // open dropdown menu
    await user.click(screen.getByRole('button', { name: /actions/i }));

    // click "Delete User" option
    await user.click(screen.getByText(/delete user/i));

    // confirm delete dialog should show
    expect(
      screen.getByText(/this action cannot be undone/i)
    ).toBeInTheDocument();

    // click confirm delete button
    await user.click(screen.getByRole('button', { name: /delete/i }));

    // validate call
    expect(mockDeleteUser).toHaveBeenCalledWith(mockUser.id);
    expect(mockOnActionComplete).toHaveBeenCalled();
  });

  it('cancel delete user operation', async () => {
    const user = userEvent.setup();

    renderWithQuery(
      <UserActions
        user={mockUser}
        currentUser={mockCurrentUser}
        onActionComplete={mockOnActionComplete}
      />
    );

    // open dropdown menu
    await user.click(screen.getByRole('button', { name: /actions/i }));

    // click "Delete User" option
    await user.click(screen.getByText(/delete user/i));

    // click cancel button
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    // validate deleteUser not called
    expect(mockDeleteUser).not.toHaveBeenCalled();
    expect(mockOnActionComplete).not.toHaveBeenCalled();
  });

  it('role change failed not call onActionComplete', async () => {
    mockSetUserRole.mockResolvedValueOnce(false);
    const user = userEvent.setup();

    renderWithQuery(
      <UserActions
        user={mockUser}
        currentUser={mockCurrentUser}
        onActionComplete={mockOnActionComplete}
      />
    );

    // open dropdown menu
    await user.click(screen.getByRole('button', { name: /actions/i }));

    // click "Make Admin" option
    await user.click(screen.getByText(/make admin/i));

    // validate call
    expect(mockSetUserRole).toHaveBeenCalledWith(mockUser.id, 'admin');
    expect(mockOnActionComplete).not.toHaveBeenCalled();
  });

  it('delete user failed not call onActionComplete', async () => {
    mockDeleteUser.mockResolvedValueOnce(false);
    const user = userEvent.setup();

    renderWithQuery(
      <UserActions
        user={mockUser}
        currentUser={mockCurrentUser}
        onActionComplete={mockOnActionComplete}
      />
    );

    // open dropdown menu
    await user.click(screen.getByRole('button', { name: /actions/i }));

    // click "Delete User" option
    await user.click(screen.getByText(/delete user/i));

    // click confirm delete button
    await user.click(screen.getByRole('button', { name: /delete/i }));

    // validate call
    expect(mockDeleteUser).toHaveBeenCalledWith(mockUser.id);
    expect(mockOnActionComplete).not.toHaveBeenCalled();
  });

  it('dropdown menu show correct options', async () => {
    const user = userEvent.setup();

    renderWithQuery(
      <UserActions
        user={mockUser}
        currentUser={mockCurrentUser}
        onActionComplete={mockOnActionComplete}
      />
    );

    // open dropdown menu
    await user.click(screen.getByRole('button', { name: /actions/i }));

    // validate menu options
    expect(screen.getByText(/make admin/i)).toBeInTheDocument();
    expect(screen.queryByText(/make user/i)).not.toBeInTheDocument();
    expect(screen.getByText(/delete user/i)).toBeInTheDocument();
  });
});
