import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VerifyPage from '@/app/(auth)/verify/page';
import { mockRouter } from '@/app/__tests__/mocks/mockRouter';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/verify',
}));

describe('VerifyPage Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  // simply show the title
  it('should show loading state initially', () => {
    render(<VerifyPage />);
    expect(screen.getByText('Email Verification')).toBeInTheDocument();
  });

  // test the successful verification process
  it('should handle successful verification', async () => {
    window.location.hash = '#type=signup&access_token=valid_token';
    render(<VerifyPage />);

    // show the success message
    await waitFor(() => {
      expect(
        screen.getByText('Email verified successfully!')
      ).toBeInTheDocument();
    });

    // show the login button
    const loginButton = screen.getByRole('button', {
      name: /continue to login/i,
    });
    expect(loginButton).toBeInTheDocument();

    // verify the 3 seconds auto redirect
    jest.advanceTimersByTime(3000);
    expect(mockRouter.push).toHaveBeenCalledWith('/login');
  });

  // test the verification failed process
  it('should handle invalid verification link', async () => {
    window.location.hash = '#type=invalid';
    render(<VerifyPage />);

    // show the error message
    await waitFor(() => {
      expect(screen.getByText('Invalid verification link')).toBeInTheDocument();
    });

    // show the home button
    const homeButton = screen.getByRole('button', { name: /return to home/i });
    expect(homeButton).toBeInTheDocument();
  });

  // test the button clicks
  it('should handle button clicks correctly', async () => {
    const user = userEvent.setup({ delay: null });

    // test the button clicks
    window.location.hash = '#type=signup&access_token=valid_token';
    render(<VerifyPage />);

    const loginButton = await screen.findByRole('button', {
      name: /continue to login/i,
    });
    await user.click(loginButton);
    expect(mockRouter.push).toHaveBeenCalledWith('/login');

    // test the failed button clicks
    jest.clearAllMocks();
    window.location.hash = '#type=invalid';
    render(<VerifyPage />);

    const homeButton = await screen.findByRole('button', {
      name: /return to home/i,
    });
    await user.click(homeButton);
    expect(mockRouter.push).toHaveBeenCalledWith('/');
  });
});
