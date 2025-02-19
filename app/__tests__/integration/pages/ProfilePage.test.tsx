import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { renderWithAllProviders } from '@/app/__tests__/utils/test-auth-utils';
import ProfilePage from '@/app/(user)/profile/page';
import { mockRouter } from '@/app/__tests__/mocks/mockRouter';
import { authHandlers } from '@/app/__tests__/mocks/authHandlers';

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

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  jest.clearAllMocks();
  localStorage.clear();
});
afterAll(() => server.close());

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
    const { user } = renderWithAllProviders(<ProfilePage />);

    // 进入编辑模式
    const editButton = await screen.findByRole('button', {
      name: /edit username/i,
    });
    await user.click(editButton);

    // 修改用户名
    const usernameInput = await screen.findByRole('textbox');
    await user.clear(usernameInput);
    await user.type(usernameInput, 'newusername');

    // 提交修改
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    // 验证API调用
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/py/auth/users/username', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({ new_username: 'newusername' }),
      });
    });
  });

  // 测试密码重置流程
  it('should handle password reset workflow', async () => {
    localStorage.setItem(
      'token',
      JSON.stringify({ access_token: 'valid-token' })
    );
    const { user } = renderWithAllProviders(<ProfilePage />);

    // 触发密码重置
    const resetButton = await screen.findByRole('button', {
      name: /change password/i,
    });
    await user.click(resetButton);

    // 验证API调用
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/py/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: mockUser.email }),
      });
    });
  });

  // 测试未授权情况
  it('should handle unauthorized state', async () => {
    localStorage.removeItem('token');
    renderWithAllProviders(<ProfilePage />);

    // 验证重定向或错误提示
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });
  });

  // 测试API错误处理
  it('should handle API errors gracefully', async () => {
    localStorage.setItem(
      'token',
      JSON.stringify({ access_token: 'invalid-token' })
    );

    // 覆盖默认的mock实现
    server.use(
      http.put('/api/py/auth/users/username', () => {
        return HttpResponse.json({ detail: 'Invalid token' }, { status: 401 });
      })
    );

    const { user } = renderWithAllProviders(<ProfilePage />);

    // 触发更新操作
    const editButton = await screen.findByRole('button', {
      name: /edit username/i,
    });
    await user.click(editButton);
    const saveButton = await screen.findByRole('button', { name: /save/i });
    await user.click(saveButton);

    // 验证错误提示
    await waitFor(() => {
      expect(screen.getByText('Failed to update username')).toBeInTheDocument();
    });
  });
});
