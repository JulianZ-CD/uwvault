import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithQuery } from '@/app/__tests__/utils/test-query-utils';
import { UserList } from '@/app/components/manage/UserList';
import { mockToast } from '@/app/__tests__/mocks/mockRouter';

// Mock useAuth hook
jest.mock('@/app/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'admin-id',
      email: 'admin@example.com',
      username: 'admin',
      role: 'admin',
    },
  }),
}));

describe('UserList', () => {
  const mockUsers = Array.from({ length: 15 }, (_, i) => ({
    id: `user-${i + 1}`,
    email: `user${i + 1}@example.com`,
    username: `user${i + 1}`,
    role: i === 0 ? 'admin' : 'user',
    created_at: '2024-01-01',
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('成功加载并显示用户列表', async () => {
    localStorage.setItem(
      'token',
      JSON.stringify({ access_token: 'fake-token' })
    );

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUsers),
    } as any);

    renderWithQuery(<UserList />);

    // 等待用户列表加载并显示
    await waitFor(() => {
      const firstPageUsers = mockUsers.slice(0, 10);
      firstPageUsers.forEach((user) => {
        expect(screen.getByText(user.email)).toBeInTheDocument();
        expect(screen.getByText(user.username || '-')).toBeInTheDocument();
        expect(
          screen.getByText(user.role, { exact: false })
        ).toBeInTheDocument();
      });
    });
  });

  it('显示空状态当没有用户数据', async () => {
    localStorage.setItem(
      'token',
      JSON.stringify({ access_token: 'fake-token' })
    );

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    } as any);

    renderWithQuery(<UserList />);

    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });

  it('处理加载失败的情况', async () => {
    localStorage.setItem(
      'token',
      JSON.stringify({ access_token: 'fake-token' })
    );

    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('Failed to fetch'));

    renderWithQuery(<UserList />);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load users',
      });
    });
  });

  it('搜索功能正常工作', async () => {
    localStorage.setItem(
      'token',
      JSON.stringify({ access_token: 'fake-token' })
    );

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUsers),
    } as any);

    const user = userEvent.setup();
    renderWithQuery(<UserList />);

    // 等待用户列表加载
    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    });

    // 输入搜索关键词
    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'user1');

    // 验证搜索结果
    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
      expect(screen.queryByText('user2@example.com')).not.toBeInTheDocument();
    });
  });

  it('分页功能正常工作', async () => {
    localStorage.setItem(
      'token',
      JSON.stringify({ access_token: 'fake-token' })
    );

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUsers),
    } as any);

    const user = userEvent.setup();
    renderWithQuery(<UserList />);

    // 等待用户列表加载
    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    });

    // 验证第一页数据
    expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    expect(screen.queryByText('user11@example.com')).not.toBeInTheDocument();

    // 点击下一页
    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

    // 验证第二页数据
    await waitFor(() => {
      expect(screen.queryByText('user1@example.com')).not.toBeInTheDocument();
      expect(screen.getByText('user11@example.com')).toBeInTheDocument();
    });
  });

  it('用户列表按角色和邮箱排序', async () => {
    localStorage.setItem(
      'token',
      JSON.stringify({ access_token: 'fake-token' })
    );

    const unsortedUsers = [
      {
        id: '1',
        email: 'user@example.com',
        username: 'user',
        role: 'user',
        created_at: '2024-01-01',
      },
      {
        id: '2',
        email: 'admin@example.com',
        username: 'admin',
        role: 'admin',
        created_at: '2024-01-01',
      },
    ];

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(unsortedUsers),
    } as any);

    renderWithQuery(<UserList />);

    await waitFor(() => {
      const cells = screen.getAllByRole('cell');
      const emails = cells.map((cell) => cell.textContent);
      expect(emails).toContain('admin@example.com');
      expect(emails).toContain('user@example.com');
      expect(emails.indexOf('admin@example.com')).toBeLessThan(
        emails.indexOf('user@example.com')
      );
    });
  });

  it('没有token时不加载用户列表', async () => {
    global.fetch = jest.fn();
    renderWithQuery(<UserList />);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByText('No users found')).toBeInTheDocument();
  });
});
