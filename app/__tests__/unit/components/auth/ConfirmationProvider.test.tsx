import '@/app/__tests__/mocks/mockRouter';
import { render, screen, act } from '@/app/__tests__/utils/test-utils';
import {
  ConfirmationProvider,
  useConfirmation,
} from '@/app/(auth)/verify/components/ConfirmationProvider';
import { mockToast } from '@/app/__tests__/mocks/mockRouter';

// create test component
const TestConfirmationComponent = () => {
  const { status, message } = useConfirmation();
  return (
    <div>
      <span data-testid="status">Status: {status}</span>
      <span data-testid="message">Message: {message}</span>
    </div>
  );
};

describe('ConfirmationProvider', () => {
  beforeEach(() => {
    // clear localStorage and URL hash
    localStorage.clear();
    window.location.hash = '';
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('email verification process', () => {
    it('handle successful verification', async () => {
      window.location.hash = '#type=signup&access_token=valid_token';

      render(
        <ConfirmationProvider>
          <TestConfirmationComponent />
        </ConfirmationProvider>
      );

      expect(screen.getByTestId('status')).toHaveTextContent('Status: success');
      expect(screen.getByTestId('message')).toHaveTextContent(
        'Email verified successfully!'
      );
    });

    it('handle invalid verification link', async () => {
      window.location.hash = '#type=invalid';

      render(
        <ConfirmationProvider>
          <TestConfirmationComponent />
        </ConfirmationProvider>
      );

      expect(screen.getByTestId('status')).toHaveTextContent('Status: error');
      expect(screen.getByTestId('message')).toHaveTextContent(
        'Invalid verification link'
      );
    });

    it('redirect to login page after 3 seconds', async () => {
      window.location.hash = '#type=signup&access_token=valid_token';
      const { useRouter } = require('next/navigation');
      const router = useRouter();

      render(
        <ConfirmationProvider>
          <TestConfirmationComponent />
        </ConfirmationProvider>
      );

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(router.push).toHaveBeenCalledWith('/login');
    });

    it('show success toast when verification is successful', async () => {
      window.location.hash = '#type=signup&access_token=valid_token';

      render(
        <ConfirmationProvider>
          <TestConfirmationComponent />
        </ConfirmationProvider>
      );

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Your email has been verified successfully.',
      });
    });
  });
});
