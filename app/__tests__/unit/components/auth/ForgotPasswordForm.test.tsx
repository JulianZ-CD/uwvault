import '@/app/__tests__/mocks/mockRouter';
import { renderWithQuery } from '@/app/__tests__/utils/test-query-utils';
import userEvent from '@testing-library/user-event';
import { ForgotPasswordForm } from '@/app/components/auth/ForgotPasswordForm';
import { useUser } from '@/app/components/user/UserProvider';
import { mockToast } from '@/app/__tests__/mocks/mockRouter';
import { screen, waitFor, act } from '@testing-library/react';

// create a persistent mock function
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

  it('submit the form successfully and show the success status', async () => {
    (useUser().resetPassword as jest.Mock).mockResolvedValue(true);
    renderWithQuery(<ForgotPasswordForm />);

    // get the form elements
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByText(/send reset link/i);

    // fill in and submit the form
    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.click(submitButton);

    // verify the toast call
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Password reset email has been sent to your email address',
      });
    });
  });

  it('handle the form submission failure', async () => {
    const errorMessage = 'Invalid email address';
    mockResetPassword.mockRejectedValueOnce(new Error(errorMessage));

    renderWithQuery(<ForgotPasswordForm />);

    // verify the initial state
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const submitButton = screen.getByText(
      /send reset link/i
    ) as HTMLButtonElement;
    expect(emailInput).toBeInTheDocument();
    expect(submitButton).toBeInTheDocument();
    expect(submitButton.disabled).toBe(false);

    // fill in the email
    await userEvent.type(emailInput, 'invalid-email');
    expect(emailInput.value).toBe('invalid-email');

    // submit the form directly
    const form = emailInput.closest('form');
    expect(form).toBeInTheDocument();

    // use act to wrap the state update
    await act(async () => {
      await userEvent.click(submitButton);
      form?.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true })
      );
    });

    // wait for the resetPassword to be called
    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('invalid-email');
    });

    // verify the error status
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    });
  });

  it('verify the required fields', async () => {
    renderWithQuery(<ForgotPasswordForm />);

    // get the form elements
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByText(/send reset link/i);

    // submit the empty form directly
    await userEvent.click(submitButton);

    // verify the required prompt
    expect(emailInput).toBeInvalid();
    expect(emailInput).toBeRequired();
  });
});
