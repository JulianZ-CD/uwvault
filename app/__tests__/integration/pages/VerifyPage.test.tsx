import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VerifyPage from '@/app/(auth)/verify/page';
import { mockRouter } from '@/app/__tests__/mocks/mockRouter';
import { mockToast } from '@/app/__tests__/mocks/mockRouter';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/verify',
}));

describe('VerifyPage Integration', () => {
  beforeEach(() => {
    // 清除 localStorage 和 URL hash
    localStorage.clear();
    window.location.hash = '';
    jest.clearAllMocks();
    // 使用假定时器
    jest.useFakeTimers();
  });

  afterEach(() => {
    // 运行所有待处理的定时器
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  // 测试初始加载状态
  it('should show loading state initially', () => {
    render(<VerifyPage />);

    // 验证加载状态
    expect(screen.getByText('Email Verification')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveClass('animate-spin');
  });

  // 测试成功验证流程
  it('should handle successful verification', async () => {
    // 设置验证成功的 URL hash
    window.location.hash = '#type=signup&access_token=valid_token';

    render(<VerifyPage />);

    // 验证成功状态
    await waitFor(() => {
      expect(
        screen.getByText('Email verified successfully!')
      ).toBeInTheDocument();
    });

    // 验证成功图标显示
    expect(screen.getByRole('img', { hidden: true })).toHaveClass(
      'text-green-500'
    );

    // 验证显示继续登录按钮
    const loginButton = screen.getByRole('button', {
      name: /continue to login/i,
    });
    expect(loginButton).toBeInTheDocument();

    // 验证 toast 提示
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Success',
      description: 'Your email has been verified successfully.',
    });

    // 验证3秒后自动跳转
    jest.advanceTimersByTime(3000);
    expect(mockRouter.push).toHaveBeenCalledWith('/login');
  });

  // 测试验证失败流程
  it('should handle invalid verification link', async () => {
    // 设置无效的 URL hash
    window.location.hash = '#type=invalid';

    render(<VerifyPage />);

    // 验证错误状态
    await waitFor(() => {
      expect(screen.getByText('Invalid verification link')).toBeInTheDocument();
    });

    // 验证错误图标显示
    expect(screen.getByRole('img', { hidden: true })).toHaveClass(
      'text-red-500'
    );

    // 验证显示返回首页按钮
    const homeButton = screen.getByRole('button', { name: /return to home/i });
    expect(homeButton).toBeInTheDocument();
  });

  // 测试按钮点击事件
  it('should handle button clicks correctly', async () => {
    const user = userEvent.setup();

    // 成功状态下的按钮点击
    window.location.hash = '#type=signup&access_token=valid_token';
    render(<VerifyPage />);

    const loginButton = await screen.findByRole('button', {
      name: /continue to login/i,
    });
    await user.click(loginButton);
    expect(mockRouter.push).toHaveBeenCalledWith('/login');

    // 清除 mock
    jest.clearAllMocks();

    // 失败状态下的按钮点击
    window.location.hash = '#type=invalid';
    render(<VerifyPage />);

    const homeButton = await screen.findByRole('button', {
      name: /return to home/i,
    });
    await user.click(homeButton);
    expect(mockRouter.push).toHaveBeenCalledWith('/');
  });
});
