'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Shield,
  LayoutDashboard,
  FolderOpen,
  Settings,
  LogOut,
  Plus,
  BarChart3,
  CreditCard,
  HelpCircle,
  ChevronLeft,
  Menu,
  Building2,
} from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  user: {
    id: string;
    name?: string | null;
    email: string;
    image?: string | null;
  };
}

const navItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Projects',
    href: '/dashboard/projects',
    icon: FolderOpen,
  },
  {
    title: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
  },
  {
    title: 'Billing',
    href: '/dashboard/billing',
    icon: CreditCard,
  },
];

const bottomNavItems = [
  {
    title: 'Company',
    href: '/dashboard/settings/company',
    icon: Building2,
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
  {
    title: 'Help',
    href: '/dashboard/help',
    icon: HelpCircle,
  },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const initials = user.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase()
    : user.email[0].toUpperCase();

  return (
    <>
      {/* Mobile overlay */}
      <div className="lg:hidden fixed inset-0 z-40 bg-black/50 hidden" />

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen bg-white border-r flex flex-col transition-all duration-300',
          collapsed ? 'w-[70px]' : 'w-[260px]'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-emerald-600 flex-shrink-0" />
            {!collapsed && <span className="font-bold text-xl">ScopePilot</span>}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* New Project Button */}
        <div className="p-3">
          <Link href="/dashboard/projects/new">
            <Button
              className={cn(
                'bg-emerald-600 hover:bg-emerald-700 w-full',
                collapsed ? 'px-0' : ''
              )}
            >
              <Plus className="h-4 w-4" />
              {!collapsed && <span className="ml-2">New Project</span>}
            </Button>
          </Link>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                    collapsed && 'justify-center px-0'
                  )}
                >
                  <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-emerald-600')} />
                  {!collapsed && <span>{item.title}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="mt-auto">
          <Separator />
          <nav className="px-3 py-2 space-y-1">
            {bottomNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                      collapsed && 'justify-center px-0'
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && <span>{item.title}</span>}
                  </div>
                </Link>
              );
            })}
          </nav>

          <Separator />

          {/* User Profile */}
          <div className={cn('p-3', collapsed && 'flex justify-center')}>
            {collapsed ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={() => signOut({ callbackUrl: '/' })}
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            ) : (
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 transition-colors">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name || 'User'}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-red-600"
                  onClick={() => signOut({ callbackUrl: '/' })}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
