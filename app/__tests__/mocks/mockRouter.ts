export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  prefetch: jest.fn(),
  refresh: jest.fn(),
  forward: jest.fn(),
};

export const mockToast = jest.fn();

// Mock Next.js navigation 模块
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock 自定义的 useToast hook
jest.mock('@/app/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));
