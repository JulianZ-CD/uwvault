import './globals.css';
import { Inter } from 'next/font/google';
import { MainNav } from '@/app/components/main-nav';
import { ThemeProvider } from '@/app/components/theme-provider';
import { Toaster } from '@/app/components/ui/toaster';
import { AuthProvider } from '@/app/components/auth/AuthProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'UWVault',
  description:
    'UWVault is a platform for UW students to share and discover academic resources.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="relative z-40 border-b">
              <MainNav />
            </div>
            <div className="relative z-0">{children}</div>
          </ThemeProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
