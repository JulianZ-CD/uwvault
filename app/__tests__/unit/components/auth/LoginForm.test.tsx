import '@/app/__tests__/mocks/mockRouter';
import { renderWithQuery } from '@/app/__tests__/utils/test-query-utils';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/app/(auth)/login/components/LoginForm';
import { mockToast, mockRouter } from '@/app/__tests__/mocks/mockRouter';
import { screen, waitFor } from '@testing-library/react';

// Mock getCurrentUser
const mockGetCurrentUser = jest.fn();
jest.mock('@/app/hooks/useAuth', () => ({
  useAuth: () => ({
    getCurrentUser: mockGetCurrentUser,
  }),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // simulate FormData
    const mockFormData = {
      get: jest.fn((key) => {
        const values = {
          email: 'test@example.com',
          password: 'password123',
        };
        return values[key as keyof typeof values] || null;
      }),
    };
    // @ts-ignore
    global.FormData = jest.fn(() => mockFormData);
  });

  it('success login and redirect to home', async () => {
    // simulate fetch
    jest.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ session: { access_token: 'fake-token' } }),
      } as Response)
    );
    const user = userEvent.setup();
    renderWithQuery(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(
      /password/i
    ) as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /login/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    // use userEvent to simulate form submission
    await user.click(submitButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/py/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Welcome back!',
        description: 'Successfully signed in to your account.',
      });
    });
    // restore fetch original implementation
    (global.fetch as jest.Mock).mockRestore();
  });

  it('handle login failed', async () => {
    // Mock failed response
    jest.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: false, // simulate failed response
        json: () => Promise.resolve({ message: 'Invalid credentials' }),
      } as Response)
    );

    const user = userEvent.setup();
    renderWithQuery(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(
      /password/i
    ) as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /login/i });

    await user.type(emailInput, 'wrong@example.com');
    await user.type(passwordInput, 'wrongpassword');

    // use userEvent to simulate form submission
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Sign in failed',
        description:
          "Please check your email and password, or create a new account if you haven't registered.",
      });
    });
    // restore fetch original implementation
    (global.fetch as jest.Mock).mockRestore();
  });

  it('test password display toggle', async () => {
    const user = userEvent.setup();
    renderWithQuery(<LoginForm />);

    const passwordInput = screen.getByLabelText(
      /password/i
    ) as HTMLInputElement;
    const toggleButton = screen.getByRole('button', { name: '' });

    expect(passwordInput.type).toBe('password');

    await user.click(toggleButton);
    expect(passwordInput.type).toBe('text');

    await user.click(toggleButton);
    expect(passwordInput.type).toBe('password');
  });
});
