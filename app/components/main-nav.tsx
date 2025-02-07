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
import { Button } from '@/app/components/ui/button';

const resources = [
  {
    title: 'Course Materials',
    href: '/resources/courses',
    description: 'Access and share course-specific study materials and notes',
  },
  {
    title: 'Study Guides',
    href: '/resources/guides',
    description: 'Comprehensive study guides and exam preparation resources',
  },
  {
    title: 'Practice Problems',
    href: '/resources/practice',
    description:
      'Collection of practice problems and solutions across subjects',
  },
  {
    title: 'Learning Tools',
    href: '/resources/tools',
    description:
      'Useful tools and resources to enhance your learning experience',
  },
];

export function MainNav() {
  const { user, logout } = useAuth();

  console.log('Navigation user state:', user);

  return (
    <div className="container flex h-16 items-center">
      <NavigationMenu className="flex-1">
        <NavigationMenuList className="flex items-center">
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
            <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                {resources.map((resource) => (
                  <ListItem
                    key={resource.title}
                    title={resource.title}
                    href={resource.href}
                  >
                    {resource.description}
                  </ListItem>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>

          <NavigationMenuItem>
            <Link href="/about" legacyBehavior passHref>
              <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                About Us
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>

          <NavigationMenuItem className="ml-auto">
            <ThemeToggle />
          </NavigationMenuItem>

          <NavigationMenuItem>
            {user ? (
              <div className="flex items-center gap-4">
                <span className={navigationMenuTriggerStyle()}>
                  {user.email}
                </span>
                <Button
                  variant="ghost"
                  className={navigationMenuTriggerStyle()}
                  onClick={logout}
                >
                  Logout
                </Button>
              </div>
            ) : (
              <Link href="/login" legacyBehavior passHref>
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  Login
                </NavigationMenuLink>
              </Link>
            )}
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
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
