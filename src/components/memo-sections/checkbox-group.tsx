'use client';

import React from 'react';
import { CheckboxGroupConfig } from '@/types';

interface CheckboxGroupProps {
  config?: CheckboxGroupConfig;
  value?: string[];
  onChange?: (value: string[]) => void;
  readonly?: boolean;
}

const DEFAULT_OPTIONS = [
  'เพื่อทราบ',
  'เพื่อขอให้ดำเนินการ',
  'ลูกค้ารายใหม่',
  'เพื่อพิจารณา',
  'เพื่อขออนุมัติ',
  'ลูกค้ารายเก่า',
];

export function CheckboxGroup({ config, value = [], onChange, readonly }: CheckboxGroupProps) {
  const options = config?.options || DEFAULT_OPTIONS;
  const columns = config?.columns || 3;

  const handleToggle = (option: string) => {
    if (readonly || !onChange) return;
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  const gridCols = columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-3' : 'grid-cols-4';

  return (
    <div className="border border-slate-900 p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-semibold text-sm text-slate-900">จุดประสงค์</span>
        <div className={`grid ${gridCols} flex-1 gap-x-6 gap-y-1`}>
          {options.map((option) => (
            <label
              key={option}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={value.includes(option)}
                onChange={() => handleToggle(option)}
                disabled={readonly}
                className="h-4 w-4 rounded border-slate-300"
              />
              <span className="text-sm text-slate-900">{option}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
