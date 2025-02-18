import '@/app/__tests__/mocks/mockRouter';
import { renderWithQuery } from '@/app/__tests__/utils/test-query-utils';
import userEvent from '@testing-library/user-event';
import { RegisterForm } from '@/app/components/auth/RegisterForm';
import { mockToast, mockRouter } from '@/app/__tests__/mocks/mockRouter';
import { screen, waitFor } from '@testing-library/react';

// disable MSW
jest.mock('msw', () => ({
  rest: {},
  setupServer: () => ({
    listen: jest.fn(),
    close: jest.fn(),
    resetHandlers: jest.fn(),
  }),
}));

describe('RegisterForm', () => {
  let formValues: { [key: string]: string };

  beforeEach(() => {
    jest.clearAllMocks();
    formValues = {}; // reset form values

    // improved FormData mock
    const mockFormData = {
      get: jest.fn((key: string) => formValues[key] || null),
      set: jest.fn((key: string, value: string) => {
        formValues[key] = value;
      }),
    };

    // @ts-ignore
    global.FormData = jest.fn(() => mockFormData);

    // listen form input
    renderWithQuery(<RegisterForm />);
  });

  it('success register and redirect to login page', async () => {
    jest.spyOn(global, 'fetch').mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            user: {
              id: '123',
              email: 'test@example.com',
              user_metadata: { username: 'testuser' },
              role: 'user',
            },
          }),
      } as Response)
    );

    const user = userEvent.setup();

    // fill form and update formValues
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    formValues.email = 'test@example.com';

    await user.type(screen.getByLabelText(/username/i), 'testuser');
    formValues.username = 'testuser';

    await user.type(screen.getByLabelText(/^password/i), 'password123');
    formValues.password = 'password123';

    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    formValues.confirmPassword = 'password123';

    const submitButton = screen.getByRole('button', { name: /register/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Registration successful',
        description: 'Please check your email to verify your account',
      });
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });
  });

  it('validate password mismatch', async () => {
    const user = userEvent.setup();

    // fill form and update formValues
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    formValues.email = 'test@example.com';

    await user.type(screen.getByLabelText(/username/i), 'testuser');
    formValues.username = 'testuser';

    await user.type(screen.getByLabelText(/^password/i), 'password123');
    formValues.password = 'password123';

    await user.type(screen.getByLabelText(/confirm password/i), 'password456');
    formValues.confirmPassword = 'password456';

    const submitButton = screen.getByRole('button', { name: /register/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Passwords do not match',
      });
    });
  });

  it('validate username length limit', async () => {
    const user = userEvent.setup();

    // fill form and update formValues
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    formValues.email = 'test@example.com';

    await user.type(screen.getByLabelText(/username/i), 'ab');
    formValues.username = 'ab';

    await user.type(screen.getByLabelText(/^password/i), 'password123');
    formValues.password = 'password123';

    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    formValues.confirmPassword = 'password123';

    const submitButton = screen.getByRole('button', { name: /register/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Username must be at least 3 characters',
      });
    });
  });

  it('test password display toggle', async () => {
    const user = userEvent.setup();

    const passwordInput = screen.getByLabelText(
      /^password/i
    ) as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText(
      /confirm password/i
    ) as HTMLInputElement;
    const toggleButtons = screen.getAllByRole('button', { name: '' });

    expect(passwordInput.type).toBe('password');
    expect(confirmPasswordInput.type).toBe('password');

    await user.click(toggleButtons[0]);
    expect(passwordInput.type).toBe('text');
    await user.click(toggleButtons[0]);
    expect(passwordInput.type).toBe('password');

    await user.click(toggleButtons[1]);
    expect(confirmPasswordInput.type).toBe('text');
    await user.click(toggleButtons[1]);
    expect(confirmPasswordInput.type).toBe('password');
  });
});
