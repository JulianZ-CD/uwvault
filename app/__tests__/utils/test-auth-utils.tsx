import { render } from '@testing-library/react';
import { UserProvider } from '@/app/components/user/UserProvider';
import { Toaster } from '@/app/components/ui/toaster';
import userEvent from '@testing-library/user-event';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';

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
