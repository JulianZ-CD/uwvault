import { http, HttpResponse } from 'msw';

// 模拟用户数据
const mockUsers = [
  {
    id: 1,
    email: 'test@example.com',
    username: 'testuser',
    role: 'user',
  },
];

export const authHandlers = [
  // 重置密码
  http.post('/api/py/auth/reset-password', async ({ request }) => {
    const { email } = await request.json();
    const user = mockUsers.find((u) => u.email === email);

    if (!user) {
      return HttpResponse.json({ detail: 'User not found' }, { status: 404 });
    }

    return HttpResponse.json(
      { message: 'Password reset email sent' },
      { status: 200 }
    );
  }),

  // 登录
  http.post('/api/py/auth/login', async ({ request }) => {
    const { email, password } = await request.json();
    const user = mockUsers.find((u) => u.email === email);

    if (!user || password !== 'correctpassword') {
      return HttpResponse.json(
        { detail: 'Invalid credentials' },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      access_token: 'fake-token',
      token_type: 'bearer',
      user,
    });
  }),

  // 注册
  http.post('/api/py/auth/register', async ({ request }) => {
    const newUser = await request.json();

    if (mockUsers.some((u) => u.email === newUser.email)) {
      return HttpResponse.json(
        { detail: 'Email already registered' },
        { status: 400 }
      );
    }

    const user = {
      id: mockUsers.length + 1,
      ...newUser,
      role: 'user',
    };
    mockUsers.push(user);

    return HttpResponse.json(user, { status: 201 });
  }),

  // 更新用户名
  http.put('/api/py/auth/users/username', async ({ request }) => {
    const { new_username } = await request.json();

    if (!new_username) {
      return HttpResponse.json(
        { detail: 'Username is required' },
        { status: 400 }
      );
    }

    return HttpResponse.json(
      { message: 'Username updated successfully' },
      { status: 200 }
    );
  }),
];
