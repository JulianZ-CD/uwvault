import { User, UserRegisteredEventDetail } from '@/app/types/user';

export const createMockUser = (overrides?: Partial<User>): User => ({
  id: '1',
  email: 'test@example.com',
  username: 'testuser',
  role: 'user',
  ...overrides,
});

export const createMockUserRegisteredEvent = (
  overrides?: Partial<UserRegisteredEventDetail>
): UserRegisteredEventDetail => ({
  id: '1',
  email: 'test@example.com',
  username: 'testuser',
  role: 'user',
  ...overrides,
});

export const mockUserData = {
  regularUser: createMockUser(),
  adminUser: createMockUser({
    id: '2',
    email: 'admin@example.com',
    username: 'admin',
    role: 'admin',
  }),
  premiumUser: createMockUser({
    id: '3',
    email: 'premium@example.com',
    username: 'premium',
    role: 'premium',
  }),
};

export const mockAuthResponses = {
  validLogin: {
    session: {
      access_token: 'valid_mock_token',
      token_type: 'bearer',
      expires_in: 3600,
    },
    user: mockUserData.regularUser,
  },
  invalidLogin: {
    detail: 'Invalid credentials',
  },
};

export const mockUserContext = {
  updateProfile: jest.fn().mockResolvedValue(undefined),
  resetPassword: jest.fn().mockResolvedValue(undefined),
};

export const mockAuthContext = {
  user: mockUserData.regularUser,
  isLoading: false,
  error: null,
  getCurrentUser: jest.fn().mockResolvedValue(mockUserData.regularUser),
  login: jest.fn().mockResolvedValue(undefined),
  logout: jest.fn().mockResolvedValue(undefined),
  isAdmin: jest.fn().mockReturnValue(false),
  requireAuth: jest.fn().mockResolvedValue(undefined),
  requireAdmin: jest.fn().mockResolvedValue(undefined),
};
