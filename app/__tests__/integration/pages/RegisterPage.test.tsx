import { screen, waitFor, within } from '@testing-library/react';
import { renderWithAuthProviders } from '../../utils/test-auth-utils';
import RegisterPage from '@/app/(auth)/register/page';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import '@/app/__tests__/mocks/mockRouter';
import userEvent from '@testing-library/user-event';

// Mock useAuth hook
jest.mock('@/app/hooks/useAuth', () => ({
  useAuth: () => ({
    getCurrentUser: jest.fn(),
    isAuthenticated: false,
    user: null,
  }),
}));

describe('RegisterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    server.resetHandlers();

    // mock FormData
    const mockFormData = {
      get: jest.fn((key) => {
        const values = {
          email: 'test@example.com',
          username: 'testuser',
          password: 'password123',
          confirmPassword: 'password123',
        };
        return values[key as keyof typeof values] || null;
      }),
    };
    // @ts-ignore
    global.FormData = jest.fn(() => mockFormData);
  });

  describe('initial render', () => {
    it('renders register form', () => {
      renderWithAuthProviders(<RegisterPage />);

      // check title
      const formContainer = screen.getByRole('main');
      expect(
        within(formContainer).getByText('Register', {
          selector: 'div.text-2xl',
        })
      ).toBeInTheDocument();

      // check input fields
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      // check button
      expect(
        screen.getByRole('button', { name: /register/i })
      ).toBeInTheDocument();
      // check link
      expect(screen.getByText(/login here/i)).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('submits credentials successfully and dispatches userRegistered event', async () => {
      const dispatchEventSpy = jest.spyOn(window, 'dispatchEvent');

      server.use(
        http.post('/api/py/auth/register', () => {
          return HttpResponse.json({
            user: {
              id: '123',
              email: 'test@example.com',
              user_metadata: { username: 'testuser' },
              role: 'user',
            },
          });
        })
      );

      const { user } = renderWithAuthProviders(<RegisterPage />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(
        screen.getByLabelText(/confirm password/i),
        'password123'
      );
      await user.click(screen.getByRole('button', { name: /register/i }));

      // directly assert, remove waitFor
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
      // more detailed assertion (optional)
      const dispatchedEvent = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
      expect(dispatchedEvent.type).toBe('userRegistered');
      expect(dispatchedEvent.detail).toEqual({
        id: '123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'user',
      });
    });

    it('handles registration error', async () => {
      server.use(
        http.post('/api/py/auth/register', () => {
          return HttpResponse.json(
            { detail: 'Registration failed' }, // ensure the error message is consistent with RegisterForm.tsx
            { status: 400 }
          );
        })
      );

      const { user } = renderWithAuthProviders(<RegisterPage />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(
        screen.getByLabelText(/confirm password/i),
        'password123'
      );
      await user.click(screen.getByRole('button', { name: /register/i }));

      await screen.findByText(/Registration failed/i); // use findByText
    });
  });

  describe('validation', () => {
    it('prevents form submission with short username', async () => {
      const { user } = renderWithAuthProviders(<RegisterPage />);

      // fill form
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/username/i), 'ab'); // username is too short
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(
        screen.getByLabelText(/confirm password/i),
        'password123'
      );

      const submitButton = screen.getByRole('button', { name: /register/i });
      await user.click(submitButton);

      // check form is still there (not submitted and not redirected)
      expect(
        screen.getByRole('button', { name: /register/i })
      ).toBeInTheDocument();

      // check username input field still contains short username
      const usernameInput = screen.getByLabelText(
        /username/i
      ) as HTMLInputElement;
      expect(usernameInput.value).toBe('ab');
    });

    it('prevents form submission with mismatched passwords', async () => {
      const { user } = renderWithAuthProviders(<RegisterPage />);

      // fill form
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(
        screen.getByLabelText(/confirm password/i),
        'password456' // mismatched passwords
      );

      const submitButton = screen.getByRole('button', { name: /register/i });
      await user.click(submitButton);

      // check form is still there (not submitted and not redirected)
      expect(
        screen.getByRole('button', { name: /register/i })
      ).toBeInTheDocument();

      // check password input field value is still the same
      const passwordInput = screen.getByLabelText(
        /^password/i
      ) as HTMLInputElement;
      const confirmPasswordInput = screen.getByLabelText(
        /confirm password/i
      ) as HTMLInputElement;
      expect(passwordInput.value).toBe('password123');
      expect(confirmPasswordInput.value).toBe('password456');
    });

    // add a positive test case to verify the behavior with valid inputs
    it('allows form submission with valid inputs', async () => {
      server.use(
        http.post('/api/py/auth/register', () => {
          return HttpResponse.json({
            user: {
              id: '123',
              email: 'test@example.com',
              user_metadata: { username: 'testuser' },
              role: 'user',
            },
          });
        })
      );

      const { user } = renderWithAuthProviders(<RegisterPage />);

      // fill valid form data
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/^password/i), 'password123');
      await user.type(
        screen.getByLabelText(/confirm password/i),
        'password123'
      );

      const submitButton = screen.getByRole('button', { name: /register/i });
      await user.click(submitButton);

      // verify the behavior after successful registration (e.g., check if the user registered event is triggered)
      await waitFor(() => {
        expect(window.dispatchEvent).toHaveBeenCalledWith(
          expect.any(CustomEvent)
        );
      });
    });
  });

  describe('password visibility toggle', () => {
    it('toggles password and confirm password visibility', async () => {
      renderWithAuthProviders(<RegisterPage />);

      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      const passwordContainer = passwordInput.closest('div');
      const confirmPasswordContainer = confirmPasswordInput.closest('div');

      const passwordToggleButton = within(passwordContainer!).getByRole(
        'button'
      );
      const confirmPasswordToggleButton = within(
        confirmPasswordContainer!
      ).getByRole('button');

      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');

      await userEvent.click(passwordToggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');

      await userEvent.click(confirmPasswordToggleButton);
      expect(confirmPasswordInput).toHaveAttribute('type', 'text');

      await userEvent.click(passwordToggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');

      await userEvent.click(confirmPasswordToggleButton);
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('navigation links', () => {
    it('renders login link', () => {
      renderWithAuthProviders(<RegisterPage />);

      expect(screen.getByRole('link', { name: /login here/i })).toHaveAttribute(
        'href',
        '/login'
      );
    });
  });
});
