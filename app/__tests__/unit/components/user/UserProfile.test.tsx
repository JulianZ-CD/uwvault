import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProfile } from '@/app/(user)/profile/components/UserProfile';
import { useUser } from '@/app/(user)/profile/components/UserProvider';
import { useAuth } from '@/app/hooks/useAuth';

jest.mock('@/app/components/user/UserProvider');
jest.mock('@/app/hooks/useAuth');

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  username: 'testuser',
  role: 'user',
};

describe('UserProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useUser as jest.Mock).mockReturnValue({
      updateProfile: jest.fn().mockResolvedValue(undefined),
      resetPassword: jest.fn().mockResolvedValue(undefined),
    });
    (useAuth as jest.Mock).mockReturnValue({
      getCurrentUser: jest.fn().mockResolvedValue(undefined),
    });
  });

  it('renders user information correctly', () => {
    render(<UserProfile user={mockUser} />);

    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.getByText('test-user-id')).toBeInTheDocument();
  });

  it('enters edit mode when clicking "Edit Username"', async () => {
    render(<UserProfile user={mockUser} />);

    const editButton = screen.getByRole('button', { name: 'Edit Username' });
    await userEvent.click(editButton);

    const usernameLabel = screen.getByText('Username');
    const usernameInput = usernameLabel.parentElement?.querySelector('input');
    expect(usernameInput).toBeInTheDocument();
  });

  it('cancels editing when clicking "Cancel"', async () => {
    render(<UserProfile user={mockUser} />);

    const editButton = screen.getByRole('button', { name: 'Edit Username' });
    await userEvent.click(editButton);

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await userEvent.click(cancelButton);

    expect(
      screen.queryByRole('textbox', { name: 'Username' })
    ).not.toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('updates username successfully', async () => {
    const { updateProfile } = useUser() as any;

    render(<UserProfile user={mockUser} />);

    const editButton = screen.getByRole('button', { name: 'Edit Username' });
    await userEvent.click(editButton);

    const usernameLabel = screen.getByText('Username');
    const usernameInput = usernameLabel.parentElement?.querySelector('input');
    await userEvent.clear(usernameInput!);
    await userEvent.type(usernameInput!, 'newusername');

    const saveButton = screen.getByRole('button', { name: 'Save' });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({
        new_username: 'newusername',
      });
    });
  });

  it('shows error message when updating username fails', async () => {
    const { updateProfile } = useUser() as any;
    updateProfile.mockRejectedValueOnce(new Error('Update failed'));

    render(<UserProfile user={mockUser} />);

    const editButton = screen.getByRole('button', { name: 'Edit Username' });
    await userEvent.click(editButton);

    const usernameLabel = screen.getByText('Username');
    const usernameInput = usernameLabel.parentElement?.querySelector('input');
    await userEvent.clear(usernameInput!);
    await userEvent.type(usernameInput!, 'newusername');

    const saveButton = screen.getByRole('button', { name: 'Save' });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({
        new_username: 'newusername',
      });
    });
  });

  it('resets password successfully', async () => {
    const { resetPassword } = useUser() as any;

    render(<UserProfile user={mockUser} />);

    const resetButton = screen.getByRole('button', { name: 'Change Password' });
    await userEvent.click(resetButton);

    await waitFor(() => {
      expect(resetPassword).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('shows error message when resetting password fails', async () => {
    const { resetPassword } = useUser() as any;
    resetPassword.mockRejectedValueOnce(new Error('Reset failed'));

    render(<UserProfile user={mockUser} />);

    const resetButton = screen.getByRole('button', { name: 'Change Password' });
    await userEvent.click(resetButton);

    await waitFor(() => {
      expect(resetPassword).toHaveBeenCalledWith('test@example.com');
    });
  });
});
