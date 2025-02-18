import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithQuery } from '@/app/__tests__/utils/test-query-utils';
import { UserList } from '@/app/components/manage/UserList';
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

  it('load successfully and show user list', async () => {
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

  it('show empty state when there is no user data', async () => {
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

  it('search successfully', async () => {
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

    // wait for table loading
    const table = await screen.findByRole('table');

    // verify initial data
    expect(screen.getByText('user1@example.com')).toBeInTheDocument();

    // execute search
    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'user1');

    // verify search result
    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
      expect(screen.queryByText('user2@example.com')).not.toBeInTheDocument();
    });
  });

  it('pagination works successfully', async () => {
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

    // wait for table loading
    const table = await screen.findByRole('table');

    // verify first page data
    const firstPageEmails = mockUsers.slice(0, 10).map((u) => u.email);
    for (const email of firstPageEmails) {
      expect(screen.getByText(email)).toBeInTheDocument();
    }

    // use more accurate selector to find next page button
    const nextButton = screen.getByLabelText('Go to next page');
    await user.click(nextButton);

    // verify data after page switch
    await waitFor(() => {
      // verify first page data
      expect(screen.queryByText(firstPageEmails[0])).not.toBeInTheDocument();
      // verify second page data
      expect(screen.getByText(mockUsers[10].email)).toBeInTheDocument();
    });
  });

  it('sort users by role and email', async () => {
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

  it('do not load user list when there is no token', async () => {
    global.fetch = jest.fn();
    renderWithQuery(<UserList />);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByText('No users found')).toBeInTheDocument();
  });
});
