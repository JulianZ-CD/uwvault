import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithQuery } from '@/app/__tests__/utils/test-query-utils';
import { UserList } from '@/app/components/manage/UserList';
import { mockToast } from '@/app/__tests__/mocks/mockRouter';
import { act } from 'react';

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
    email: `user${String(i + 1).padStart(2, '0')}@example.com`,
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

    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row');
    const dataRows = rows.slice(1);
    const firstPageUsers = mockUsers.slice(0, 10);

    firstPageUsers.forEach((user, index) => {
      const cells = within(dataRows[index]).getAllByRole('cell');
      expect(cells[0]).toHaveTextContent(user.email);
      expect(cells[1]).toHaveTextContent(user.username);
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

    const error = new Error('Failed to fetch');
    global.fetch = jest.fn().mockRejectedValueOnce(error);

    renderWithQuery(<UserList />);

    // 等待错误状态显示
    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching users:',
        expect.any(Error)
      );
    });

    // 验证 toast 调用
    expect(mockToast).toHaveBeenCalledWith({
      variant: 'destructive',
      title: 'Error',
      description: 'Failed to load users',
    });
  });

  it('搜索功能正常工作', async () => {
    localStorage.setItem(
      'token',
      JSON.stringify({ access_token: 'fake-token' })
    );

    const mockUsers = [
      {
        id: '1',
        email: 'user1@example.com',
        username: 'user1',
        role: 'admin',
        created_at: '2024-01-01',
      },
      {
        id: '2',
        email: 'user2@example.com',
        username: 'user2',
        role: 'user',
        created_at: '2024-01-01',
      },
    ];

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUsers),
    } as any);

    const user = userEvent.setup();
    await act(async () => {
      renderWithQuery(<UserList />);
    });

    // 等待表格加载
    const table = await screen.findByRole('table');

    // 验证初始数据
    expect(screen.getByText('user1@example.com')).toBeInTheDocument();

    // 执行搜索
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

    // 等待表格加载
    const table = await screen.findByRole('table');

    // 验证第一页数据
    const firstPageEmails = mockUsers.slice(0, 10).map((u) => u.email);
    for (const email of firstPageEmails) {
      expect(screen.getByText(email)).toBeInTheDocument();
    }

    // 使用更准确的选择器找到下一页按钮
    const nextButton = screen.getByLabelText('Go to next page');
    await user.click(nextButton);

    // 验证页面切换后的数据
    await waitFor(() => {
      // 验证第一页的第一个用户不在页面上
      expect(screen.queryByText(firstPageEmails[0])).not.toBeInTheDocument();
      // 验证第二页的第一个用户在页面上
      expect(screen.getByText(mockUsers[10].email)).toBeInTheDocument();
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
