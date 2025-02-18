import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProvider, useUser } from '@/app/components/user/UserProvider';

// 创建一个使用 UserProvider 的子组件
const TestComponent = () => {
  const { updateProfile, resetPassword } = useUser();

  return (
    <div>
      <button
        onClick={() => updateProfile({ new_username: 'testuser' })}
        data-testid="update-profile-button"
      >
        Update Profile
      </button>
      <button
        onClick={() => resetPassword('test@example.com')}
        data-testid="reset-password-button"
      >
        Reset Password
      </button>
    </div>
  );
};

describe('UserProvider', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('updateProfile can be called correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    localStorage.setItem(
      'token',
      JSON.stringify({ access_token: 'fake-token' })
    );

    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    );

    const updateProfileButton = screen.getByTestId('update-profile-button');
    await userEvent.click(updateProfileButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/py/auth/users/username', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer fake-token',
        },
        body: JSON.stringify({ new_username: 'testuser' }),
      });
    });
    localStorage.removeItem('token');
  });

  it('resetPassword can be called correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    );

    const resetPasswordButton = screen.getByTestId('reset-password-button');
    await userEvent.click(resetPasswordButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/py/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: 'test@example.com' }),
      });
    });
  });

  it('throws error when updateProfile fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });
    localStorage.setItem(
      'token',
      JSON.stringify({ access_token: 'fake-token' })
    );

    const TestUpdateProfileError = () => {
      const { updateProfile } = useUser();
      return (
        <div data-testid="test-component">
          {/* @ts-ignore */}
          {
            (window.testUpdateProfile = () =>
              updateProfile({ new_username: 'testuser' }))
          }
        </div>
      );
    };

    render(
      <UserProvider>
        <TestUpdateProfileError />
      </UserProvider>
    );

    await expect(
      // @ts-ignore
      window.testUpdateProfile()
    ).rejects.toThrow('Failed to update profile');

    localStorage.removeItem('token');
  });

  it('throws error when resetPassword fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    const TestResetPasswordError = () => {
      const { resetPassword } = useUser();
      return (
        <div data-testid="test-component">
          {/* @ts-ignore */}
          {(window.testResetPassword = () => resetPassword('test@example.com'))}
        </div>
      );
    };

    render(
      <UserProvider>
        <TestResetPasswordError />
      </UserProvider>
    );

    await expect(
      // @ts-ignore
      window.testResetPassword()
    ).rejects.toThrow('Failed to send reset password email');
  });
});
