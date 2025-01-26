import '@testing-library/jest-dom';
import { server } from './mocks/server';
import { beforeAll, afterAll, afterEach } from '@jest/globals';

// Start MSW
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Hide console warnings
// jest.spyOn(console, 'warn').mockImplementation(() => {}); 