import { screen, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { renderWithAllProviders } from '@/app/__tests__/utils/test-auth-utils';
import ProfilePage from '@/app/(user)/profile/page';
import { mockRouter } from '@/app/__tests__/mocks/mockRouter';
import { authHandlers } from '@/app/__tests__/mocks/authHandlers';
import { useAuth } from '@/app/hooks/useAuth';
import { ProtectedRoute } from '@/app/components/auth/ProtectedRoute';

jest.mock('@/app/hooks/useAuth');

const server = setupServer(...authHandlers);

// mock user data
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  username: 'testuser',
  role: 'user',
};

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/profile',
}));

// set global fetch mock
beforeAll(() => {
  global.fetch = jest.fn();
  server.listen();
});

afterEach(() => {
  server.resetHandlers();
  jest.clearAllMocks();
  localStorage.clear();
});

afterAll(() => {
  server.close();
});

// create wrapped profile page
const WrappedProfilePage = () => (
  <ProtectedRoute>
    <ProfilePage />
  </ProtectedRoute>
);

describe('ProfilePage Integration', () => {
  beforeEach(() => {
    // reset all mocks
    jest.clearAllMocks();
    localStorage.clear();
    mockRouter.push.mockReset();
    (global.fetch as jest.Mock).mockReset();
  });

  // test normal rendering
  it('should render profile page with user data', async () => {
    // set auth status
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
    });

    renderWithAllProviders(<WrappedProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Profile Settings')).toBeInTheDocument();
    });

    // verify user info
    expect(screen.getByText(mockUser.username)).toBeInTheDocument();
    expect(screen.getByText(mockUser.email)).toBeInTheDocument();
    expect(screen.getByText(mockUser.role)).toBeInTheDocument();
  });

  // test username update workflow
  it('should handle username update workflow', async () => {
    // 1. set localStorage token
    const mockToken = 'mock-token';
    localStorage.setItem('token', JSON.stringify({ access_token: mockToken }));

    // 2. set fetch mock return value
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Username updated successfully' }),
    });

    // 3. set auth status
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
      token: mockToken, // ensure consistent with localStorage token
    });

    const { user } = renderWithAllProviders(<WrappedProfilePage />);

    // 4. wait for edit button to appear and click
    const editButton = await screen.findByRole('button', {
      name: /edit/i,
    });
    await user.click(editButton);

    // 5. wait for input box to appear and input new username
    const input = await screen.findByRole('textbox');
    await user.clear(input);
    await user.type(input, 'newusername');

    // 6. wait for save button to appear and click
    const saveButton = await screen.findByRole('button', { name: /save/i });
    await user.click(saveButton);

    // 7. verify API call
    await waitFor(
      () => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/py/auth/users/username'),
          expect.objectContaining({
            method: 'PUT',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              Authorization: `Bearer ${mockToken}`,
            }),
            body: JSON.stringify({ new_username: 'newusername' }),
          })
        );
      },
      {
        timeout: 2000,
      }
    );
  });

  // test password reset workflow
  it('should handle password reset workflow', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Success' }),
    });

    const { user } = renderWithAllProviders(<WrappedProfilePage />);

    const resetButton = await screen.findByRole('button', {
      name: /change password/i,
    });
    await user.click(resetButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/py/auth/reset-password',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: 'test@example.com' }),
        })
      );
    });
  });

  // test unauthorized state
  it('should handle unauthorized state', async () => {
    // set unauthenticated status
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });

    renderWithAllProviders(<WrappedProfilePage />);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });
  });

  // test API error handling
  it('should handle API errors gracefully', async () => {
    // set fetch mock return error
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ detail: 'Failed to update username' }),
    });

    // set auth status
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
    });

    const { user } = renderWithAllProviders(<WrappedProfilePage />);

    // use correct button text
    const editButton = await screen.findByRole('button', {
      name: /Edit/i,
    });
    await user.click(editButton);

    const input = await screen.findByRole('textbox');
    await user.clear(input);
    await user.type(input, 'invalid');

    const saveButton = await screen.findByRole('button', { name: /save/i });
    await user.click(saveButton);

    // verify error prompt
    await waitFor(() => {
      expect(
        screen.getByText(/Failed to update username/i)
      ).toBeInTheDocument();
    });
  });
});
