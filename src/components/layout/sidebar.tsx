'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  FileText,
  CheckCircle,
  Settings,
  Users,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

interface SidebarProps {
  className?: string;
}

const navigation = [
  { name: 'แดชบอร์ด', href: '/dashboard', icon: LayoutDashboard, roles: ['admin'] },
  { name: 'Memo ทั้งหมด', href: '/dashboard/memos', icon: FileText, roles: ['admin'] },
  { name: 'รออนุมัติ', href: '/dashboard/approvals', icon: CheckCircle, roles: ['admin'] },
  { name: 'Event Logs', href: '/dashboard/event-logs', icon: FileText, roles: ['admin'] },
  { name: 'การตั้งค่า', href: '/dashboard/settings', icon: Settings, roles: ['admin'] },
];

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(mounted ? (user?.role || 'user') : 'user')
  );

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const sidebarContent = (
    <>
      <div className="flex h-14 items-center justify-between border-b px-4">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white font-bold">M</div>
          <span className="text-lg font-bold text-slate-900">MemoHub</span>
        </Link>
        <button className="lg:hidden" onClick={() => setMobileOpen(false)}>
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200">
            <Users className="h-4 w-4 text-slate-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-slate-900">{mounted ? (user?.displayName || 'ผู้ใช้งาน') : 'ผู้ใช้งาน'}</p>
            <p className="text-xs text-slate-700 truncate">{mounted ? (user?.email || '') : ''}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="ออกจากระบบ">
            <LogOut className="h-4 w-4 text-slate-700" />
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        className="fixed left-4 top-3 z-50 rounded-lg bg-white p-2 shadow-md lg:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div className={cn(
        'fixed inset-y-0 left-0 z-40 w-64 transform bg-white transition-transform lg:static lg:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        className
      )}>
        {sidebarContent}
      </div>
    </>
  );
}
