'use client';

import React from 'react';
import { DropdownSelectConfig } from '@/types';

interface DropdownSelectProps {
  config?: DropdownSelectConfig;
  value?: string;
  onChange?: (value: string) => void;
  readonly?: boolean;
  label?: string;
}

export function DropdownSelect({ config, value = '', onChange, readonly, label }: DropdownSelectProps) {
  const options = config?.options || [];
  const placeholder = config?.placeholder || 'เลือก';

  if (readonly) {
    return (
      <div className="border border-slate-900 p-3">
        <div className="flex items-center gap-2">
          {label && <span className="font-semibold text-sm text-slate-900">{label}</span>}
          <span className="text-sm text-slate-900">{value || '-'}</span>
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
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
