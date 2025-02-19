import { render } from '@testing-library/react';
import { UserProvider } from '@/app/components/user/UserProvider';
import { Toaster } from '@/app/components/ui/toaster';
import userEvent from '@testing-library/user-event';
import { MockRouterProvider } from '../mocks/mockRouter';

export function renderWithAuthProviders(ui: React.ReactElement) {
  const user = userEvent.setup();
  return {
    user,
    ...render(
      <MockRouterProvider>
        <UserProvider>
          {ui}
          <Toaster />
        </UserProvider>
      </MockRouterProvider>
    ),
  };
}
