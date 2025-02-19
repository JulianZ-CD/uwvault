import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { renderWithAllProviders } from '@/app/__tests__/utils/test-auth-utils';
import ProfilePage from '@/app/(user)/profile/page';
import { mockRouter } from '@/app/__tests__/mocks/mockRouter';
import { authHandlers } from '@/app/__tests__/mocks/authHandlers';
import { useAuth } from '@/app/hooks/useAuth';

// Mock useAuth
jest.mock('@/app/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      username: 'testuser',
      role: 'user',
    },
    loading: false,
    isAuthenticated: true,
    getCurrentUser: jest.fn().mockResolvedValue({}),
  }),
}));

const server = setupServer(...authHandlers);

// 测试用户数据
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

// 设置全局 fetch mock
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

describe('ProfilePage Integration', () => {
  // 测试正常渲染
  it('should render profile page with user data', async () => {
    localStorage.setItem(
      'token',
      JSON.stringify({ access_token: 'valid-token' })
    );

    renderWithAllProviders(<ProfilePage />);

    // 验证基础布局
    await waitFor(() => {
      expect(screen.getByText('Profile Settings')).toBeInTheDocument();
    });

    // 验证用户信息
    expect(screen.getByText(mockUser.username)).toBeInTheDocument();
    expect(screen.getByText(mockUser.email)).toBeInTheDocument();
    expect(screen.getByText(mockUser.role)).toBeInTheDocument();
  });

  // 测试用户名更新流程
  it('should handle username update workflow', async () => {
    localStorage.setItem(
      'token',
      JSON.stringify({ access_token: 'valid-token' })
    );

    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: 'Success' }),
      })
    );

    const { user } = renderWithAllProviders(<ProfilePage />);

    const editButton = await screen.findByRole('button', {
      name: /edit username/i,
    });
    await user.click(editButton);

    const input = await screen.findByRole('textbox');
    await user.clear(input);
    await user.type(input, 'newusername');

    const saveButton = await screen.findByRole('button', { name: /save/i });
    await user.click(saveButton);

    // 只验证 API 调用
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/py/auth/users/username',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid-token',
          },
          body: JSON.stringify({ new_username: 'newusername' }),
        })
      );
    });
  });

  // 测试密码重置流程
  it('should handle password reset workflow', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Success' }),
    });

    const { user } = renderWithAllProviders(<ProfilePage />);

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

  // 测试未授权情况
  it('should handle unauthorized state', async () => {
    mockRouter.push.mockReset();

    // 直接修改已存在的 mock
    jest.mock('@/app/hooks/useAuth', () => ({
      useAuth: () => ({
        user: null,
        isLoading: false,
        error: null,
        isAdmin: () => false,
        requireAuth: jest.fn(),
        requireAdmin: jest.fn(),
        getCurrentUser: jest.fn(),
        login: jest.fn(),
        logout: jest.fn(),
      }),
    }));

    renderWithAllProviders(<ProfilePage />);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });
  });

  // 测试API错误处理
  it('should handle API errors gracefully', async () => {
    // Mock 错误响应
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ detail: 'Failed to update username' }),
    });

    const { user } = renderWithAllProviders(<ProfilePage />);

    // 执行更新操作
    const editButton = await screen.findByRole('button', {
      name: /edit username/i,
    });
    await user.click(editButton);

    const input = await screen.findByRole('textbox');
    await user.clear(input);
    await user.type(input, 'invalid');

    const saveButton = await screen.findByRole('button', { name: /save/i });
    await user.click(saveButton);

    // 验证错误提示
    await waitFor(
      () => {
        expect(
          screen.getByText(/Failed to update username/i)
        ).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });
});
