import { render } from '@testing-library/react';
import { UserProvider } from '@/app/components/user/UserProvider';
import { Toaster } from '@/app/components/ui/toaster';
import userEvent from '@testing-library/user-event';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { ToastProvider } from '@/app/components/ui/toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/app/components/auth/AuthProvider';

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
  // Next.js 应用路由器需要的其他属性
  pathname: '/',
  route: '/',
  asPath: '/',
  query: {},
};

export function renderWithAuthProviders(ui: React.ReactElement) {
  const user = userEvent.setup();
  return {
    user,
    ...render(
      <AppRouterContext.Provider value={mockRouter}>
        <UserProvider>
          {ui}
          <Toaster />
        </UserProvider>
      </AppRouterContext.Provider>
    ),
  };
}

interface Props {
  children: React.ReactNode;
}

// 创建一个包装所有 Provider 的组件
const AllTheProviders = ({ children }: Props) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // ✅ turns retries off
        retry: false,
      },
    },
  });
  return (
    <AppRouterContext.Provider value={mockRouter}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <UserProvider>
              {children}
              <Toaster />
            </UserProvider>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </AppRouterContext.Provider>
  );
};

// 新的 render 函数
export const renderWithAllProviders = (ui: React.ReactElement) => {
  return {
    user: userEvent.setup(),
    // 添加 `wrapper` 选项
    ...render(ui, { wrapper: AllTheProviders }),
  };
};
