import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

function render(ui: React.ReactElement, options = {}) {
  return {
    ...rtlRender(ui, { ...options }),
    user: userEvent.setup(),
  };
}

export * from '@testing-library/react';
export { render }; 