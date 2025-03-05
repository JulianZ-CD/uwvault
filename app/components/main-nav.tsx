'use client';

import * as React from 'react';
import Link from 'next/link';
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

const resources = [
  {
    title: 'Resource Management',
    href: '/resources',
    description: 'Manage and browse all resources in one place',
  },
];

export function MainNav() {
  const { user, logout, isLoading } = useAuth();

  return (
    <div className="container flex h-16 items-center">
      <div className="flex-1">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link href="/" legacyBehavior passHref>
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  UWVault
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <Link href="/todo" legacyBehavior passHref>
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  Todo
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <Link href="/resources" legacyBehavior passHref>
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  Resources
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <Link href="/about" legacyBehavior passHref>
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  About Us
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      {/* right side user menu */}
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
  );
}

const ListItem = React.forwardRef<
  React.ElementRef<'a'>,
  React.ComponentPropsWithoutRef<'a'>
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            'block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
            className
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = 'ListItem';
