import { render, screen } from '@testing-library/react';
import { ProtectedRoute } from '@/app/components/auth/ProtectedRoute';
import { mockRouter } from '@/app/__tests__/mocks/mockRouter';
import { ReactNode } from 'react';

jest.mock('next/navigation', () => ({
  ...jest.requireActual('next/navigation'),
  useRouter: () => mockRouter,
}));

// Mock useAuth hook
const mockUseAuth = jest.fn();
jest.mock('@/app/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading component when isLoading is true', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: true });
    render(<ProtectedRoute>Test Child</ProtectedRoute>);
    expect(screen.getByRole('status')).toBeInTheDocument(); // 假设 LoadingSpinner 有 status role
  });

  it('redirects to login when isLoading is false and user is null', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    render(<ProtectedRoute>Test Child</ProtectedRoute>);
    expect(mockRouter.push).toHaveBeenCalledWith('/login');
  });

  it('renders children when user is not null', () => {
    mockUseAuth.mockReturnValue({
      user: { name: 'Test User' },
      isLoading: false,
    });
    render(<ProtectedRoute>Test Child</ProtectedRoute>);
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('renders custom loading component when provided', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: true });
    const CustomLoadingComponent = () => <div>Custom Loading...</div>;
    render(
      <ProtectedRoute loadingComponent={<CustomLoadingComponent />}>
        Test Child
      </ProtectedRoute>
    );
    expect(screen.getByText('Custom Loading...')).toBeInTheDocument();
  });
});
