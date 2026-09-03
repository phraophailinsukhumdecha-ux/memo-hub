'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

const DashboardTitleContext = createContext<{
  title: string;
  setTitle: (t: string) => void;
}>({ title: 'แดชบอร์ด', setTitle: () => {} });

export function useDashboardTitle() {
  return useContext(DashboardTitleContext);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [title, setTitle] = useState('แดชบอร์ด');
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace('/home');
    }
  }, [user, router]);

  if (!mounted || !user || user.role !== 'admin') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <DashboardTitleContext.Provider value={{ title, setTitle }}>
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header title={title} />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </DashboardTitleContext.Provider>
  );
}
