import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VerifyPage from '@/app/(auth)/verify/page';
import { mockRouter } from '@/app/__tests__/mocks/mockRouter';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/verify',
}));

describe('VerifyPage Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  // 测试初始加载状态
  it('should show loading state initially', () => {
    render(<VerifyPage />);

    // 验证页面标题和加载状态
    expect(screen.getByText('Email Verification')).toBeInTheDocument();
    const loadingSpinner = screen.getByRole('status', { hidden: true });
    expect(loadingSpinner).toHaveClass('animate-spin');
  });

  // 测试成功验证流程
  it('should handle successful verification', async () => {
    window.location.hash = '#type=signup&access_token=valid_token';
    render(<VerifyPage />);

    // 验证成功消息显示
    await waitFor(() => {
      expect(
        screen.getByText('Email verified successfully!')
      ).toBeInTheDocument();
    });

    // 验证继续登录按钮显示
    const loginButton = screen.getByRole('button', {
      name: /continue to login/i,
    });
    expect(loginButton).toBeInTheDocument();

    // 验证3秒后自动跳转
    jest.advanceTimersByTime(3000);
    expect(mockRouter.push).toHaveBeenCalledWith('/login');
  });

  // 测试验证失败流程
  it('should handle invalid verification link', async () => {
    window.location.hash = '#type=invalid';
    render(<VerifyPage />);

    // 验证错误消息显示
    await waitFor(() => {
      expect(screen.getByText('Invalid verification link')).toBeInTheDocument();
    });

    // 验证返回首页按钮显示
    const homeButton = screen.getByRole('button', { name: /return to home/i });
    expect(homeButton).toBeInTheDocument();
  });

  // 测试按钮点击
  it('should handle button clicks correctly', async () => {
    const user = userEvent.setup({ delay: null });

    // 测试成功状态的按钮点击
    window.location.hash = '#type=signup&access_token=valid_token';
    render(<VerifyPage />);

    const loginButton = await screen.findByRole('button', {
      name: /continue to login/i,
    });
    await user.click(loginButton);
    expect(mockRouter.push).toHaveBeenCalledWith('/login');

    // 测试失败状态的按钮点击
    jest.clearAllMocks();
    window.location.hash = '#type=invalid';
    render(<VerifyPage />);

    const homeButton = await screen.findByRole('button', {
      name: /return to home/i,
    });
    await user.click(homeButton);
    expect(mockRouter.push).toHaveBeenCalledWith('/');
  });
});
