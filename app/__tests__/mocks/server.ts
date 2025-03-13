import { setupServer } from 'msw/node';
import { handlers } from './handlers';
import { authHandlers } from './authHandlers';

export const server = setupServer(...handlers, ...authHandlers);
