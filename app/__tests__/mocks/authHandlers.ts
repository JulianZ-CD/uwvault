import { http, HttpResponse } from 'msw';
import { UserContextType } from '@/app/types/user';

type UpdateProfileRequest = Parameters<UserContextType['updateProfile']>[0];
type ResetPasswordRequest = {
  email: Parameters<UserContextType['resetPassword']>[0];
};
type LoginRequest = {
  email: string;
  password: string;
};
type RegisterRequest = {
  email: string;
  username: string;
  password: string;
};

interface MockUser {
  id: number;
  email: string;
  username: string;
  role: string;
}

const mockUsers: MockUser[] = [
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
    const { email } = (await request.json()) as ResetPasswordRequest;
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
    const { email, password } = (await request.json()) as LoginRequest;
    const user = mockUsers.find((u) => u.email === email);

    if (!user || password !== 'correctpassword') {
      return HttpResponse.json(
        { detail: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const session = {
      access_token: 'fake-token',
      token_type: 'bearer',
      user,
    };

    return HttpResponse.json({ session }, { status: 200 });
  }),

  // 注册
  http.post('/api/py/auth/register', async ({ request }) => {
    const newUser = (await request.json()) as RegisterRequest;

    if (mockUsers.some((u) => u.email === newUser.email)) {
      return HttpResponse.json(
        { detail: 'Email already registered' },
        { status: 400 }
      );
    }

    const user: MockUser = {
      id: mockUsers.length + 1,
      email: newUser.email,
      username: newUser.username,
      role: 'user',
    };

    mockUsers.push(user);

    return HttpResponse.json({ user }, { status: 201 });
  }),

  // 更新用户名
  http.put('/api/py/auth/users/username', async ({ request }) => {
    const data = (await request.json()) as UpdateProfileRequest;

    if (!data.new_username) {
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
