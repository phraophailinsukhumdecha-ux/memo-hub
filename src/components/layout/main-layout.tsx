'use client';

import React from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function MainLayout({ children, title }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
