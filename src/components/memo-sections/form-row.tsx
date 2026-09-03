'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormRowConfig } from '@/types';

interface FormRowProps {
  config?: FormRowConfig;
  value?: Record<string, string>;
  onChange?: (value: Record<string, string>) => void;
  readonly?: boolean;
  memoType?: string;
}

const DEFAULT_CONFIG: FormRowConfig = {
  fields: [
    { name: 'subject', label: 'เรื่อง', type: 'text', placeholder: '', width: 'full' },
    { name: 'date', label: 'วันที่', type: 'date', placeholder: '', width: 'half' },
    { name: 'to', label: 'เรียน', type: 'text', placeholder: '', width: 'full' },
    { name: 'quotationNo', label: 'เลขที่ใบเสนอราคา', type: 'text', placeholder: '', width: 'half' },
    { name: 'customerName', label: 'ชื่อลูกค้า', type: 'text', placeholder: '', width: 'full' },
    { name: 'jobNo', label: 'เลข JOB', type: 'text', placeholder: '', width: 'half' },
  ],
};

export function FormRow({ config, value = {}, onChange, readonly, memoType }: FormRowProps) {
  const cfg = config || DEFAULT_CONFIG;

  const handleChange = (fieldName: string, fieldValue: string) => {
    if (readonly || !onChange) return;
    onChange({ ...value, [fieldName]: fieldValue });
  };

  const isFieldRequired = (fieldName: string, requiredByType?: string[]) => {
    if (!requiredByType || requiredByType.length === 0) return false;
    if (!memoType) return false;
    return requiredByType.includes(memoType);
  };

  const rows: { left: typeof cfg.fields[0]; right: typeof cfg.fields[0] | null }[] = [];
  for (let i = 0; i < cfg.fields.length; i += 2) {
    rows.push({
      left: cfg.fields[i],
      right: cfg.fields[i + 1] || null,
    });
  }

  return (
    <div className="border border-slate-900 divide-y divide-slate-900">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-2">
          <div className="flex items-center px-3 py-2 border-r border-slate-900">
            <Label className="text-sm font-semibold whitespace-nowrap text-slate-900 w-32">
              {row.left.label}
              {isFieldRequired(row.left.name, row.left.requiredByType) && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </Label>
            <div className="flex-1">
              {readonly ? (
                <span className="text-sm">{value[row.left.name] || ''}</span>
              ) : row.left.type === 'date' ? (
                <input
                  type="date"
                  value={value[row.left.name] || ''}
                  onChange={(e) => handleChange(row.left.name, e.target.value)}
                  className="w-full text-sm border-0 bg-transparent p-0 focus:outline-none text-slate-900"
                />
              ) : (
                <Input
                  value={value[row.left.name] || ''}
                  onChange={(e) => handleChange(row.left.name, e.target.value)}
                  placeholder={row.left.placeholder}
                  className="border-0 bg-transparent p-0 h-auto shadow-none focus-visible:ring-0"
                />
              )}
            </div>
          </div>
          {row.right ? (
            <div className="flex items-center px-3 py-2">
              <Label className="text-sm font-semibold whitespace-nowrap text-slate-900 w-32">
                {row.right.label}
                {isFieldRequired(row.right.name, row.right.requiredByType) && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </Label>
              <div className="flex-1">
                {readonly ? (
                  <span className="text-sm">{value[row.right?.name || ''] || ''}</span>
                ) : row.right?.type === 'date' ? (
                  <input
                    type="date"
                    value={value[row.right?.name || ''] || ''}
                    onChange={(e) => handleChange(row.right?.name || '', e.target.value)}
                    className="w-full text-sm border-0 bg-transparent p-0 focus:outline-none text-slate-900"
                  />
                ) : (
                  <Input
                    value={value[row.right?.name || ''] || ''}
                    onChange={(e) => handleChange(row.right?.name || '', e.target.value)}
                    placeholder={row.right?.placeholder}
                    className="border-0 bg-transparent p-0 h-auto shadow-none focus-visible:ring-0"
                  />
                )}
              </div>
            </div>
          ) : (
            <div />
          )}
        </div>
      ))}
    </div>
  );
}
