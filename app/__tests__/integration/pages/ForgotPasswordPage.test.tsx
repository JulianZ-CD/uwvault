import { render, screen, waitFor } from '../../utils/test-utils';
import ForgotPasswordPage from '@/app/(auth)/forgot-password/page';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';

describe('ForgotPasswordPage', () => {
  describe('initial render', () => {
    it('renders forgot password form', () => {
      render(<ForgotPasswordPage />);

      expect(
        screen.getByRole('heading', { name: /forgot password/i })
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /reset password/i })
      ).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('submits email successfully', async () => {
      const { user } = render(<ForgotPasswordPage />);

      await user.type(
        screen.getByPlaceholderText(/email/i),
        'test@example.com'
      );
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/password reset email sent/i)
        ).toBeInTheDocument();
      });
    });

    it('handles submission error', async () => {
      server.use(
        http.post('/api/py/auth/reset-password', () => {
          return new HttpResponse(
            JSON.stringify({ detail: 'Failed to send reset email' }),
            { status: 500 }
          );
        })
      );

      const { user } = render(<ForgotPasswordPage />);

      await user.type(
        screen.getByPlaceholderText(/email/i),
        'test@example.com'
      );
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/failed to send reset email/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('validation', () => {
    it('shows error when email is empty', async () => {
      const { user } = render(<ForgotPasswordPage />);

      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    it('shows error when email format is invalid', async () => {
      const { user } = render(<ForgotPasswordPage />);

      await user.type(screen.getByPlaceholderText(/email/i), 'invalid-email');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('handles network error', async () => {
      server.use(
        http.post('/api/py/auth/reset-password', () => {
          throw new Error('Network error');
        })
      );

      const { user } = render(<ForgotPasswordPage />);

      await user.type(
        screen.getByPlaceholderText(/email/i),
        'test@example.com'
      );
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/failed to send reset email/i)
        ).toBeInTheDocument();
      });
    });
  });
});
