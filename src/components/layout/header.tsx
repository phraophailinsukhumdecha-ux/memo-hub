'use client';

import React from 'react';

interface HeaderProps {
  title?: string;
}

export function Header({ title = 'แดชบอร์ด' }: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center space-x-4">
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      </div>
    </header>
  );
}
