import { render, screen, waitFor, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProvider, useUser } from '@/app/components/user/UserProvider';

// create a child component of UserProvider
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

    const { result } = renderHook(() => useUser(), {
      wrapper: UserProvider,
    });

    await expect(
      result.current.updateProfile({ new_username: 'testuser' })
    ).rejects.toThrow('Failed to update profile');

    localStorage.removeItem('token');
  });

  it('throws error when resetPassword fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    const { result } = renderHook(() => useUser(), {
      wrapper: UserProvider,
    });

    await expect(
      result.current.resetPassword('test@example.com')
    ).rejects.toThrow('Failed to send reset password email');
  });
});
