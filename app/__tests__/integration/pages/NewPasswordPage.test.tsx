import { screen, waitFor } from '@testing-library/react';
import { renderWithAuthProviders } from '../../utils/test-auth-utils';
import NewPasswordPage from '@/app/(auth)/new-password/page';
import '@/app/__tests__/mocks/mockRouter';
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

      // check input fields
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();

      // check submit button
      expect(
        screen.getByRole('button', { name: /update password/i })
      ).toBeInTheDocument();
    });
  });

  describe('password update functionality', () => {
    it('successfully updates password with valid inputs', async () => {
      // Mock fetch globally
      const mockFetch = jest.spyOn(global, 'fetch').mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Password updated' }),
        } as Response)
      );

      const { user } = renderWithAuthProviders(<NewPasswordPage />);

      // fill form
      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', {
        name: /update password/i,
      });

      await user.type(newPasswordInput, 'newPassword123');
      await user.type(confirmPasswordInput, 'newPassword123');
      await user.click(submitButton);

      // verify request is sent
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/py/auth/update-password'),
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

      // clean up mock
      mockFetch.mockRestore();
    });

    it('prevents submission with mismatched passwords', async () => {
      const { user } = renderWithAuthProviders(<NewPasswordPage />);

      // fill mismatched passwords
      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', {
        name: /update password/i,
      });

      await user.type(newPasswordInput, 'password123');
      await user.type(confirmPasswordInput, 'differentPassword');
      await user.click(submitButton);

      // check form is still there (not submitted)
      expect(
        screen.getByRole('button', { name: /update password/i })
      ).toBeInTheDocument();

      // check input fields value is still the same
      expect(newPasswordInput).toHaveValue('password123');
      expect(confirmPasswordInput).toHaveValue('differentPassword');
    });

    it('prevents submission with short password', async () => {
      const { user } = renderWithAuthProviders(<NewPasswordPage />);

      // fill short password
      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', {
        name: /update password/i,
      });

      await user.type(newPasswordInput, 'short');
      await user.type(confirmPasswordInput, 'short');
      await user.click(submitButton);

      // check form is still there (not submitted)
      expect(
        screen.getByRole('button', { name: /update password/i })
      ).toBeInTheDocument();

      // check input fields value is still the same
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

      // check initial state
      expect(newPasswordInput).toHaveAttribute('type', 'password');
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');

      // toggle new password visibility
      await user.click(toggleButtons[0]);
      expect(newPasswordInput).toHaveAttribute('type', 'text');
      await user.click(toggleButtons[0]);
      expect(newPasswordInput).toHaveAttribute('type', 'password');

      // toggle confirm password visibility
      await user.click(toggleButtons[1]);
      expect(confirmPasswordInput).toHaveAttribute('type', 'text');
      await user.click(toggleButtons[1]);
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    });
  });
});
