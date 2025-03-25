'use client'
import Link from "next/link"
import { Button } from "@/app/components/ui/button"
import { Github } from "lucide-react"

import * as React from 'react';
import { useAuth } from '@/app/hooks/useAuth';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/app/components/ui/navigation-menu';
import { ThemeToggle } from '@/app/components/theme-toggle';
import { cn } from '@/app/lib/utils';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';

export default function Navbar() {

  const { user, logout, isLoading } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex justify-center w-full">
        <div className="container flex h-14 max-w-screen-lg items-center px-4">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">UWvault</span>
          </Link>
          <nav className="flex flex-1 items-center space-x-6 text-sm font-medium">
            <Link href="/todo" className="transition-colors hover:text-primary">
              Todo
            </Link>
            <Link href="/course" className="transition-colors hover:text-primary">
              Course
            </Link>
            <Link href="/resources" className="transition-colors hover:text-primary">
              Rescource
            </Link>
          </nav>
          <div className="flex items-center space-x-4">
            <Link href="https://github.com/JulianZ-CD/uwvault" target="_blank" rel="noreferrer">
              <Button variant="ghost" size="icon">
                <Github className="h-4 w-4" />
                <span className="sr-only">GitHub</span>
              </Button>
            </Link>
            <Link href="https://github.com/JulianZ-CD/uwvault/wiki" target="_blank" rel="nonferrer">
             <Button variant="ghost" size="sm">
              Wiki
              </Button>
            </Link>
            
            <div className="ml-auto flex items-center gap-4">
        <ThemeToggle />

        <NavigationMenu>
          <NavigationMenuList>
            {isLoading ? (
              <NavigationMenuItem>
                <div className="flex items-center justify-center w-[120px] h-9">
                  <LoadingSpinner />
                </div>
              </NavigationMenuItem>
            ) : user ? (
              <NavigationMenuItem>
                <NavigationMenuTrigger>
                  {user.username || user.email}
                </NavigationMenuTrigger>
                <NavigationMenuContent className="z-50">
                  <ul className="min-w-[200px] p-2 space-y-1">
                    <li>
                      <Link href="/profile" legacyBehavior passHref>
                        <NavigationMenuLink
                          className={cn(
                            'flex w-full items-center gap-2 px-3 py-2 text-sm',
                            'rounded-md hover:bg-accent transition-colors',
                            'focus:bg-accent focus:outline-none'
                          )}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="shrink-0"
                          >
                            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                          <span>Profile</span>
                        </NavigationMenuLink>
                      </Link>
                    </li>
                    {user?.role === 'admin' && (
                      <li>
                        <Link href="/manage-users" legacyBehavior passHref>
                          <NavigationMenuLink
                            className={cn(
                              'flex w-full items-center gap-2 px-3 py-2 text-sm',
                              'rounded-md hover:bg-accent transition-colors',
                              'focus:bg-accent focus:outline-none'
                            )}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="shrink-0"
                            >
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                            <span>Manage Users</span>
                          </NavigationMenuLink>
                        </Link>
                      </li>
                    )}
                    <li className="h-px bg-border my-1" />
                    <li>
                      <button
                        onClick={logout}
                        className={cn(
                          'flex w-full items-center gap-2 px-3 py-2 text-sm',
                          'rounded-md hover:bg-accent transition-colors',
                          'focus:bg-accent focus:outline-none'
                        )}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="shrink-0"
                        >
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" x2="9" y1="12" y2="12" />
                        </svg>
                        <span>Logout</span>
                      </button>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            ) : (
              <NavigationMenuItem>
                <Link href="/login" legacyBehavior passHref>
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                    Login
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            )}
          </NavigationMenuList>
        </NavigationMenu>
      </div>
          </div>
        </div>
      </div>
    </header>
  )
}

