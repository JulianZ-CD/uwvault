import React from 'react';
import '@/app/__tests__/mocks/mockRouter';
import { render, screen, act } from '../../utils/test-utils';
import {
  ConfirmationProvider,
  useConfirmation,
} from '@/app/components/auth/ConfirmationProvider';
import { mockToast } from '@/app/__tests__/mocks/mockRouter';

// 创建测试组件
const TestConfirmationComponent = () => {
  const { status, message } = useConfirmation();
  return (
    <div>
      <span data-testid="status">Status: {status}</span>
      <span data-testid="message">Message: {message}</span>
    </div>
  );
};

describe('ConfirmationProvider', () => {
  beforeEach(() => {
    // 清除 localStorage 和 URL hash
    localStorage.clear();
    window.location.hash = '';
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('starts with loading state', async () => {
      // 模拟 useEffect 不执行
      jest.spyOn(React, 'useEffect').mockImplementationOnce(() => {});

      // 确保没有 hash 参数
      window.location.hash = '';

      await act(async () => {
        render(
          <ConfirmationProvider>
            <TestConfirmationComponent />
          </ConfirmationProvider>
        );
      });

      // 在 useEffect 执行前检查初始状态
      const statusElement = screen.getByTestId('status');
      expect(statusElement).toHaveTextContent('Status: loading');
    });
  });

  describe('email verification', () => {
    it('handles successful verification', async () => {
      // 设置 URL hash 参数
      window.location.hash = '#type=signup&access_token=valid_token';

      await act(async () => {
        render(
          <ConfirmationProvider>
            <TestConfirmationComponent />
          </ConfirmationProvider>
        );
      });

      expect(screen.getByTestId('status')).toHaveTextContent('Status: success');
      expect(screen.getByTestId('message')).toHaveTextContent(
        'Email verified successfully!'
      );
    });

    it('handles invalid verification link', async () => {
      // 设置无效的 URL hash 参数
      window.location.hash = '#type=invalid';

      await act(async () => {
        render(
          <ConfirmationProvider>
            <TestConfirmationComponent />
          </ConfirmationProvider>
        );
      });

      expect(screen.getByTestId('status')).toHaveTextContent('Status: error');
      expect(screen.getByTestId('message')).toHaveTextContent(
        'Invalid verification link'
      );
    });

    it('redirects to login page after successful verification', async () => {
      // 设置 URL hash 参数
      window.location.hash = '#type=signup&access_token=valid_token';

      const { useRouter } = require('next/navigation');
      const router = useRouter();

      await act(async () => {
        render(
          <ConfirmationProvider>
            <TestConfirmationComponent />
          </ConfirmationProvider>
        );
      });

      // 运行所有定时器并等待异步操作完成
      await act(async () => {
        jest.useFakeTimers();
        jest.runAllTimers();
        jest.useRealTimers();
      });

      // 等待可能的微任务执行完成
      await new Promise((resolve) => setTimeout(resolve, 0));

      // 验证是否调用了路由跳转
      expect(router.push).toHaveBeenCalledWith('/login');
    });
  });

  describe('toast notifications', () => {
    it('shows success toast on successful verification', async () => {
      // 设置 URL hash 参数
      window.location.hash = '#type=signup&access_token=valid_token';

      await act(async () => {
        render(
          <ConfirmationProvider>
            <TestConfirmationComponent />
          </ConfirmationProvider>
        );
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Your email has been verified successfully.',
      });
    });
  });
});
