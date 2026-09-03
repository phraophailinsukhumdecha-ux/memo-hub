'use client';

import React from 'react';
import { MemoTypeConfig } from '@/types';

interface MemoTypeProps {
  config?: MemoTypeConfig;
  value?: string;
  onChange?: (value: string) => void;
  readonly?: boolean;
  label?: string;
}

export function MemoType({ config, value = '', onChange, readonly, label }: MemoTypeProps) {
  const options = config?.options || [];

  if (readonly) {
    const selectedOption = options.find((o) => o.value === value);
    return (
      <div className="border border-slate-900 p-3">
        <div className="flex items-center gap-2">
          {label && <span className="font-semibold text-sm text-slate-900">{label}</span>}
          <span className="text-sm text-slate-900">{selectedOption?.label || value || '-'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-slate-900 p-3">
      <div className="flex items-center gap-2">
        {label && <span className="font-semibold text-sm text-slate-900">{label}</span>}
        <select
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="flex-1 text-sm text-slate-900 border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">เลือกประเภท</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
