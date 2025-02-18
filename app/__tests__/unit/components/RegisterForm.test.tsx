import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterForm } from '@/app/components/auth/RegisterForm';
import { mockToast, mockRouter } from '@/app/__tests__/mocks/mockRouter';

jest.mock('next/navigation', () => ({
  ...jest.requireActual('next/navigation'),
  useRouter: () => mockRouter,
}));

// Mock useToast hook
jest.mock('@/app/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe('RegisterForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers successfully and redirects to login', async () => {
    // Mock successful fetch response
    jest.spyOn(global, 'fetch').mockImplementation(async () => {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
              user_metadata: { username: 'testuser' },
              role: 'user',
            },
          }),
      } as Response);
    });

    const user = userEvent.setup();
    render(<RegisterForm />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const usernameInput = screen.getByLabelText(
      /username/i
    ) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(
      /password/i
    ) as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText(
      /confirm password/i
    ) as HTMLInputElement;
    const submitButton = screen.getByRole('button', {
      name: /register/i,
    });

    await user.type(emailInput, 'test@example.com');
    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/py/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          origin: window.location.origin, // 确保 origin 被正确传递
        },
        body: JSON.stringify({
          email: 'test@example.com',
          username: 'testuser',
          password: 'password123',
        }),
        credentials: 'include',
      });
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Registration successful',
        description: 'Please check your email to verify your account',
      });
    });

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });

    (global.fetch as jest.Mock).mockRestore();
  });

  it('handles registration failure', async () => {
    // Mock failed fetch response
    jest.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ detail: 'Registration failed' }),
      } as Response)
    );

    const user = userEvent.setup();
    render(<RegisterForm />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const usernameInput = screen.getByLabelText(
      /username/i
    ) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(
      /password/i
    ) as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText(
      /confirm password/i
    ) as HTMLInputElement;
    const submitButton = screen.getByRole('button', {
      name: /register/i,
    });

    await user.type(emailInput, 'test@example.com');
    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Registration Error',
        description: 'Registration failed',
      });
    });

    (global.fetch as jest.Mock).mockRestore();
  });

  it('handles short username', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    const usernameInput = screen.getByLabelText(
      /username/i
    ) as HTMLInputElement;
    const submitButton = screen.getByRole('button', {
      name: /register/i,
    });

    await user.type(usernameInput, 'us'); // Short username
    await user.click(submitButton);

    expect(mockToast).toHaveBeenCalledWith({
      variant: 'destructive',
      title: 'Validation Error',
      description: 'Username must be at least 3 characters',
    });
  });

  it('handles long username', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    const usernameInput = screen.getByLabelText(
      /username/i
    ) as HTMLInputElement;
    const submitButton = screen.getByRole('button', {
      name: /register/i,
    });

    await user.type(usernameInput, 'a'.repeat(51)); // Long username
    await user.click(submitButton);

    expect(mockToast).toHaveBeenCalledWith({
      variant: 'destructive',
      title: 'Validation Error',
      description: 'Username must be less than 50 characters',
    });
  });

  it('handles password mismatch', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    const passwordInput = screen.getByLabelText(
      /password/i
    ) as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText(
      /confirm password/i
    ) as HTMLInputElement;
    const submitButton = screen.getByRole('button', {
      name: /register/i,
    });

    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'differentPassword'); // Mismatch
    await user.click(submitButton);

    expect(mockToast).toHaveBeenCalledWith({
      variant: 'destructive',
      title: 'Validation Error',
      description: 'Passwords do not match',
    });
  });

  it('handles short password', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    const passwordInput = screen.getByLabelText(
      /password/i
    ) as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText(
      /confirm password/i
    ) as HTMLInputElement;
    const submitButton = screen.getByRole('button', {
      name: /register/i,
    });

    await user.type(passwordInput, 'short'); // Short password
    await user.type(confirmPasswordInput, 'short');
    await user.click(submitButton);

    expect(mockToast).toHaveBeenCalledWith({
      variant: 'destructive',
      title: 'Validation Error',
      description: 'Password must be at least 8 characters',
    });
  });
});
