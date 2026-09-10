'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormRowConfig } from '@/types';
import { User, MemoTypography } from '@/types';
import { resolveTypography } from '@/lib/typography';

interface FormRowProps {
  config?: FormRowConfig;
  value?: Record<string, string>;
  onChange?: (value: Record<string, string>) => void;
  readonly?: boolean;
  memoType?: string;
  users?: User[];
  typography?: MemoTypography;
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

export function FormRow({ config, value = {}, onChange, readonly, memoType, users = [], typography }: FormRowProps) {
  const cfg = config || DEFAULT_CONFIG;
  const typo = resolveTypography(typography);

  const handleChange = (fieldName: string, fieldValue: string) => {
    if (readonly || !onChange) return;
    onChange({ ...value, [fieldName]: fieldValue });
  };

  const isFieldRequired = (fieldName: string, requiredByType?: string[]) => {
    if (!requiredByType || requiredByType.length === 0) return false;
    if (!memoType) return false;
    return requiredByType.includes(memoType);
  };

  if (readonly) {
    // Fields already shown in CompanyHeader - don't duplicate
    const headerFieldNames = ['RefNo', 'refNo', 'quotationNo', 'jobNo', 'date'];
    const displayFields = cfg.fields.filter((f) => !headerFieldNames.includes(f.name));

    const resolveUserName = (uid: string) => {
      const user = users.find((u) => u.id === uid);
      return user?.displayName || uid;
    };

    const resolveValue = (f: typeof cfg.fields[0], val: string) => {
      const fieldType = f.type as string;
      if (fieldType === 'user_dropdown') return resolveUserName(val);
      if (fieldType === 'user_multiselect') {
        const ids = Array.isArray(val) ? val as string[] : [];
        return ids.length > 0 ? ids.map((id) => resolveUserName(id)).join(', ') : '-';
      }
      return val || '-';
    };

    // Bordered table layout matching PDF (pairs of fields per row)
    const rows: { left: typeof cfg.fields[0]; right: typeof cfg.fields[0] | null }[] = [];
    for (let i = 0; i < displayFields.length; i += 2) {
      rows.push({
        left: displayFields[i],
        right: displayFields[i + 1] || null,
      });
    }

    const labelSize = Math.round(typo.baseFontSize * 0.88);
    const cellStyle: React.CSSProperties = {
      fontFamily: typo.fontFamily,
      lineHeight: typo.lineHeight,
    };

    return (
      <div className="border border-slate-900 divide-y divide-slate-900" style={cellStyle}>
        {rows.map((row, ri) => (
          <div key={ri} className="grid grid-cols-2">
            <div className="flex items-center px-3 py-2 border-r border-slate-900">
              <span className="font-semibold text-slate-900 w-36 shrink-0" style={{ fontSize: `${labelSize}px` }}>{row.left.label}</span>
              <span className="text-slate-900" style={{ fontSize: `${typo.baseFontSize}px`, fontWeight: typo.boldBody ? 700 : 400 }}>: {resolveValue(row.left, value[row.left.name] as string)}</span>
            </div>
            {row.right ? (
              <div className="flex items-center px-3 py-2">
                <span className="font-semibold text-slate-900 w-36 shrink-0" style={{ fontSize: `${labelSize}px` }}>{row.right.label}</span>
                <span className="text-slate-900" style={{ fontSize: `${typo.baseFontSize}px`, fontWeight: typo.boldBody ? 700 : 400 }}>: {resolveValue(row.right, value[row.right.name] as string)}</span>
              </div>
            ) : (
              <div />
            )}
          </div>
        ))}
      </div>
    );
  }

  // Editable mode - pair fields into rows of 2
  const rows: { left: typeof cfg.fields[0]; right: typeof cfg.fields[0] | null }[] = [];
  for (let i = 0; i < cfg.fields.length; i += 2) {
    rows.push({
      left: cfg.fields[i],
      right: cfg.fields[i + 1] || null,
    });
  }

  // CLIENT SPECIFIC / VENDOR SPECIFIC: at least one required, both may be
  // selected. × clears the value to re-pick.
  const isExclusivePair = (fieldName: string) =>
    fieldName === 'clientSpecific' || fieldName === 'vendorSpecific';

  const renderDropdownInput = (f: typeof cfg.fields[0]) => {
    const currentVal = (value[f.name] as string) || '';
    return (
      <div className="flex items-center gap-1">
        <div className="flex-1 min-w-0">
          <Select
            value={currentVal}
            onValueChange={(val) => handleChange(f.name, val)}
          >
            <SelectTrigger className="border-0 bg-transparent p-0 h-auto shadow-none focus-visible:ring-0">
              <SelectValue placeholder="เลือก" />
            </SelectTrigger>
            <SelectContent>
              {(f.options || []).map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isExclusivePair(f.name) && currentVal && (
          <button
            type="button"
            onClick={() => handleChange(f.name, '')}
            title="ล้างค่า"
            className="shrink-0 h-5 w-5 rounded-full text-xs leading-none text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200"
          >
            ×
          </button>
        )}
      </div>
    );
  };

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
              {row.left.type === 'date' ? (
                <input
                  type="date"
                  value={value[row.left.name] || ''}
                  onChange={(e) => handleChange(row.left.name, e.target.value)}
                  className="w-full text-sm border-0 bg-transparent p-0 focus:outline-none text-slate-900"
                />
              ) : row.left.type === 'dropdown' ? (
                renderDropdownInput(row.left)
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
                {row.right?.type === 'date' ? (
                  <input
                    type="date"
                    value={value[row.right?.name || ''] || ''}
                    onChange={(e) => handleChange(row.right?.name || '', e.target.value)}
                    className="w-full text-sm border-0 bg-transparent p-0 focus:outline-none text-slate-900"
                  />
                ) : row.right?.type === 'dropdown' ? (
                  renderDropdownInput(row.right!)
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
