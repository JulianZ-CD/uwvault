import "./globals.css"
import { Inter, Nunito } from "next/font/google"
import type React from "react"
import type { Metadata } from "next"
import MouseMoveEffect from "@/app/components/mouse-move-effect"
import Navbar from "@/app/components/Navbar"
import { AuthProvider } from "@/app/components/auth/AuthProvider"
import { UserProvider } from "@/app/(user)/profile/components/UserProvider"
import { ThemeProvider } from "next-themes"

const inter = Inter({ subsets: ["latin"] })
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" })

export const metadata: Metadata = {
  title: "UWVault",
  description: "UWVault is a platform for UW students to share and discover academic resources.",
  icons: {
    icon: '/supaicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${nunito.variable}`} suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <MouseMoveEffect />
          <AuthProvider>
            <UserProvider>
              {/* Background gradients */}
              <div className="pointer-events-none fixed inset-0">
                <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
                <div className="absolute right-0 top-0 h-[500px] w-[500px] bg-blue-500/10 blur-[100px]" />
                <div className="absolute bottom-0 left-0 h-[500px] w-[500px] bg-purple-500/10 blur-[100px]" />
              </div>
              
              <div className="relative z-10 flex flex-col min-h-screen w-full">
                <Navbar />
                <main className="flex-grow flex justify-center w-full">
                  <div className="container max-w-screen-lg px-4 w-full">
                    {children}
                  </div>
                </main>
              </div>
            </UserProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

