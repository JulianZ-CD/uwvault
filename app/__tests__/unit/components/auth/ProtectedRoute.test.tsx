import { render, screen } from '@testing-library/react';
import { ProtectedRoute } from '@/app/components/auth/ProtectedRoute';
import { mockRouter } from '@/app/__tests__/mocks/mockRouter';

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
});
