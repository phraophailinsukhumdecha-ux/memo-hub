'use client';

import React from 'react';

interface SectionTitleProps {
  label?: string;
  readonly?: boolean;
}

export function SectionTitle({ label = 'MEMO', readonly }: SectionTitleProps) {
  return (
    <div className="border-b-2 border-slate-900 py-3 text-center">
      <h1 className="text-2xl font-bold tracking-wider text-slate-900">{label}</h1>
    </div>
  );
}
