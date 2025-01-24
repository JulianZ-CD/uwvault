import "./globals.css";
import { Inter } from "next/font/google";
import { MainNav } from "@/app/components/main-nav";
import { ThemeProvider } from "@/app/components/theme-provider";
import { Toaster } from "@/app/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "UWVault",
  description: "UWVault is a platform for UW students to share and discover academic resources.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <header className="border-b">
            <div className="container flex h-16 items-center px-4">
              <MainNav />
            </div>
          </header>
          {children}
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
