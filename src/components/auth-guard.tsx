'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const publicPaths = ['/memo-view', '/email-cancel', '/email-approve'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (loading) return;

    const isAuthRoute = pathname.startsWith('/auth');
    const isPublicPath = isAuthRoute || publicPaths.some((p) => pathname === p || pathname.startsWith(p));

    if (!user && !isPublicPath) {
      router.push('/auth/login');
    } else if (user && isAuthRoute) {
      router.push(user.role === 'admin' ? '/dashboard' : '/home');
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
          <p className="mt-2 text-sm text-slate-500">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
