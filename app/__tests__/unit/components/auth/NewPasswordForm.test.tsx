import { renderWithQuery } from '@/app/__tests__/utils/test-query-utils';
import userEvent from '@testing-library/user-event';
import { NewPasswordForm } from '@/app/(auth)/new-password/components/NewPasswordForm';
import { mockToast, mockRouter } from '@/app/__tests__/mocks/mockRouter';
import { screen, waitFor } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  ...jest.requireActual('next/navigation'),
  useRouter: () => mockRouter,
}));

// Mock window.location.hash
const mockLocation = {
  hash: '#access_token=fake-access-token&refresh_token=fake-refresh-token',
};
// @ts-ignore
delete window.location;
// @ts-ignore
window.location = mockLocation;

// Mock useToast hook
jest.mock('@/app/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe('NewPasswordForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates password successfully and redirects to login', async () => {
    // Mock successful fetch response
    jest.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      const requestBody = JSON.parse(init?.body as string);

      if (!requestBody.access_token || !requestBody.refresh_token) {
        return Promise.resolve({
          ok: false,
          json: () =>
            Promise.resolve({
              message:
                'Invalid or expired password reset link. Please request a new password reset email.',
            }),
        } as Response);
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: 'Password updated' }),
      } as Response);
    });

    const user = userEvent.setup();
    renderWithQuery(<NewPasswordForm />);

    const newPasswordInput = screen.getByLabelText(
      /new password/i
    ) as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText(
      /confirm password/i
    ) as HTMLInputElement;
    const submitButton = screen.getByRole('button', {
      name: /update password/i,
    });

    await user.type(newPasswordInput, 'newPassword123');
    await user.type(confirmPasswordInput, 'newPassword123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/py/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: 'fake-access-token',
          refresh_token: 'fake-refresh-token',
          new_password: 'newPassword123',
        }),
      });
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Password updated successfully',
      });
    });

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });

    (global.fetch as jest.Mock).mockRestore();
  });

  it('handles password update failure', async () => {
    // Mock failed fetch response
    jest.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ detail: 'Update failed' }),
      } as Response)
    );

    const user = userEvent.setup();
    renderWithQuery(<NewPasswordForm />);

    const newPasswordInput = screen.getByLabelText(
      /new password/i
    ) as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText(
      /confirm password/i
    ) as HTMLInputElement;
    const submitButton = screen.getByRole('button', {
      name: /update password/i,
    });

    await user.type(newPasswordInput, 'newPassword123');
    await user.type(confirmPasswordInput, 'newPassword123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Error',
        description: 'Update failed',
      });
    });

    (global.fetch as jest.Mock).mockRestore();
  });

  it('handles password mismatch', async () => {
    const user = userEvent.setup();
    renderWithQuery(<NewPasswordForm />);

    const newPasswordInput = screen.getByLabelText(
      /new password/i
    ) as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText(
      /confirm password/i
    ) as HTMLInputElement;
    const submitButton = screen.getByRole('button', {
      name: /update password/i,
    });

    await user.type(newPasswordInput, 'newPassword123');
    await user.type(confirmPasswordInput, 'differentPassword');
    await user.click(submitButton);
    // 不需要等待 fetch，直接检查 toast
    expect(mockToast).toHaveBeenCalledWith({
      variant: 'destructive',
      title: 'Error',
      description: "Passwords don't match",
    });
  });

  it('handles short password', async () => {
    const user = userEvent.setup();
    renderWithQuery(<NewPasswordForm />);

    const newPasswordInput = screen.getByLabelText(
      /new password/i
    ) as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText(
      /confirm password/i
    ) as HTMLInputElement;
    const submitButton = screen.getByRole('button', {
      name: /update password/i,
    });

    await user.type(newPasswordInput, 'short');
    await user.type(confirmPasswordInput, 'short');
    await user.click(submitButton);

    // 不需要等待 fetch，直接检查 toast
    expect(mockToast).toHaveBeenCalledWith({
      variant: 'destructive',
      title: 'Error',
      description: 'Password must be at least 8 characters long',
    });
  });

  it('tests password display toggle', async () => {
    const user = userEvent.setup();
    renderWithQuery(<NewPasswordForm />);

    const newPasswordInput = screen.getByLabelText(
      /new password/i
    ) as HTMLInputElement;
    const newPasswordToggleButton = screen.getAllByRole('button', {
      name: '',
    })[0];

    expect(newPasswordInput.type).toBe('password');
    await user.click(newPasswordToggleButton);
    expect(newPasswordInput.type).toBe('text');
    await user.click(newPasswordToggleButton);
    expect(newPasswordInput.type).toBe('password');

    const confirmPasswordInput = screen.getByLabelText(
      /confirm password/i
    ) as HTMLInputElement;
    const confirmPasswordToggleButton = screen.getAllByRole('button', {
      name: '',
    })[1];
    expect(confirmPasswordInput.type).toBe('password');
    await user.click(confirmPasswordToggleButton);
    expect(confirmPasswordInput.type).toBe('text');
    await user.click(confirmPasswordToggleButton);
    expect(confirmPasswordInput.type).toBe('password');
  });
});
