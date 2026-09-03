'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ApprovalGridConfig, User, Group } from '@/types';
import { Plus, X } from 'lucide-react';

interface ApprovalGridProps {
  config?: ApprovalGridConfig;
  value?: Record<string, { name?: string; userId?: string; signed?: boolean; date?: string; time?: string; signerTitle?: string; colTitle?: string }>;
  onChange?: (value: Record<string, { name?: string; userId?: string; signed?: boolean; date?: string; time?: string; signerTitle?: string; colTitle?: string }>) => void;
  readonly?: boolean;
  memoType?: string;
  globalMemoTypeColumns?: { memoType: string; columns: { title: string; subtitle?: string }[] }[];
  ownerUser?: User | null;
  users?: User[];
  groups?: Group[];
}

const DEFAULT_CONFIG: ApprovalGridConfig = {
  columns: [
    { title: 'ผู้ขออนุมัติ', subtitle: '' },
    { title: 'ตรวจสอบ', subtitle: '' },
    { title: 'อนุมัติ', subtitle: '' },
  ],
};

export function ApprovalGrid({ config, value = {}, onChange, readonly, memoType, globalMemoTypeColumns, ownerUser, users }: ApprovalGridProps) {
  const cfg = config || DEFAULT_CONFIG;

  let configColumns = cfg.columns;

  if (memoType && globalMemoTypeColumns && globalMemoTypeColumns.length > 0) {
    const dynamicConfig = globalMemoTypeColumns.find((d) => d.memoType === memoType);
    if (dynamicConfig && dynamicConfig.columns.length > 0) {
      configColumns = dynamicConfig.columns;
    }
  } else if (memoType && cfg.dynamicByType) {
    const dynamicConfig = cfg.dynamicByType.find((d) => d.memoType === memoType);
    if (dynamicConfig) {
      configColumns = dynamicConfig.columns;
    }
  }

  const colIndices = Object.keys(value)
    .filter((k) => k.startsWith('col_'))
    .map((k) => parseInt(k.split('_')[1]))
    .sort((a, b) => a - b);

  const totalColumns = Math.max(colIndices.length, configColumns.length);
  const lastIndex = totalColumns - 1;
  const canRemove = totalColumns > 3;

  const getColTitle = (colIndex: number) => {
    const colData = value[`col_${colIndex}`] || {};
    if (colData.colTitle) return colData.colTitle;
    if (colIndex === 0) return 'ผู้ขออนุมัติ';
    return 'อนุมัติ';
  };

  const handleFieldChange = (colIndex: number, field: string, fieldValue: string) => {
    if (readonly || !onChange) return;
    const colKey = `col_${colIndex}`;
    onChange({
      ...value,
      [colKey]: { ...value[colKey], [field]: fieldValue },
    });
  };

  const handleColTitleChange = (colIndex: number, title: string) => {
    if (readonly || !onChange) return;
    const colKey = `col_${colIndex}`;
    onChange({
      ...value,
      [colKey]: { ...value[colKey], colTitle: title },
    });
  };

  const handleUserSelect = (colIndex: number, userId: string) => {
    const selectedUser = users?.find((u) => u.id === userId);
    if (!selectedUser || !onChange) return;
    const colKey = `col_${colIndex}`;
    const signerTitle = colIndex === lastIndex ? (selectedUser.position || '') : (selectedUser.department || '');
    onChange({
      ...value,
      [colKey]: {
        ...value[colKey],
        name: selectedUser.displayName,
        userId: selectedUser.id,
        signerTitle,
      },
    });
  };

  const handleAddColumn = () => {
    if (!onChange) return;
    const lastKey = `col_${lastIndex}`;
    const lastColData = value[lastKey] || {};
    const newColData = { name: '', signerTitle: '', date: '', time: '', colTitle: 'อนุมัติ' };

    const sortedKeys = Object.keys(value).sort((a, b) => {
      return parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]);
    });

    const newValue: typeof value = {};
    let newIdx = 0;
    for (const key of sortedKeys) {
      const idx = parseInt(key.split('_')[1]);
      if (idx === lastIndex) {
        newValue[`col_${newIdx}`] = newColData;
        newIdx++;
      }
      newValue[`col_${newIdx}`] = value[key];
      newIdx++;
    }
    onChange(newValue);
  };

  const handleRemoveColumn = (colIndex: number) => {
    if (!onChange || !canRemove || colIndex <= 0 || colIndex >= lastIndex) return;
    const newValue: typeof value = {};
    let newIndex = 0;
    for (const key of Object.keys(value).sort((a, b) => {
      const ai = parseInt(a.split('_')[1]);
      const bi = parseInt(b.split('_')[1]);
      return ai - bi;
    })) {
      const oldIndex = parseInt(key.split('_')[1]);
      if (oldIndex === colIndex) continue;
      newValue[`col_${newIndex}`] = value[key];
      newIndex++;
    }
    onChange(newValue);
  };

  const renderColumn = (colIndex: number) => {
    const colKey = `col_${colIndex}`;
    const colData = value[colKey] || {};
    const isFirst = colIndex === 0;
    const isLast = colIndex === lastIndex;
    const isMiddle = !isFirst && !isLast;

    const colTitle = getColTitle(colIndex);

    if (isFirst) {
      const displayName = ownerUser?.displayName || colData.name || '';
      const displayTitle = ownerUser?.department || colData.signerTitle || '';
      return (
        <div key={colIndex} className="p-4">
          {!readonly && (
            <div className="mb-2">
              <input
                type="text"
                value={colTitle}
                onChange={(e) => handleColTitleChange(colIndex, e.target.value)}
                className="w-full text-center font-semibold text-sm text-slate-900 bg-transparent border-b border-slate-700 pb-1 focus:outline-none focus:border-slate-500"
              />
            </div>
          )}
          {readonly && (
            <div className="text-center mb-4">
              <p className="font-semibold text-sm text-slate-900">{colTitle}</p>
            </div>
          )}
          <div className="space-y-3 text-sm text-slate-900">
            <div>
              <p className="mb-1">ลงชื่อ</p>
              <p className="border-b border-slate-700 pb-1 min-h-[1.5rem]">
                {displayName ? `( ${displayName} )` : '(  )'}
              </p>
            </div>
            <div>
              <p className="mb-1">ตำแหน่ง</p>
              <p className="border-b border-slate-700 pb-1 min-h-[1.5rem]">
                {displayTitle}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1">วันที่</p>
                {readonly ? (
                  <p className="border-b border-slate-700 pb-1 min-h-[1.5rem]">{colData.date || ''}</p>
                ) : (
                  <input type="date" value={colData.date || ''} onChange={(e) => handleFieldChange(colIndex, 'date', e.target.value)} className="w-full border-b border-slate-700 bg-transparent pb-1 focus:outline-none text-sm" />
                )}
              </div>
              {cfg.showTime && (
                <div>
                  <p className="mb-1">เวลา</p>
                  {readonly ? (
                    <p className="border-b border-slate-700 pb-1 min-h-[1.5rem]">{colData.time || ''}</p>
                  ) : (
                    <input type="time" value={colData.time || ''} onChange={(e) => handleFieldChange(colIndex, 'time', e.target.value)} className="w-full border-b border-slate-700 bg-transparent pb-1 focus:outline-none text-sm" />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (isMiddle) {
      return (
        <div key={colIndex} className="p-4">
          <div className="flex items-center justify-between mb-4">
            {readonly ? (
              <p className="font-semibold text-sm text-slate-900 w-full text-center">{colTitle}</p>
            ) : (
              <div className="flex items-center justify-center gap-1 w-full">
                <input
                  type="text"
                  value={colTitle}
                  onChange={(e) => handleColTitleChange(colIndex, e.target.value)}
                  className="flex-1 text-center font-semibold text-sm text-slate-900 bg-transparent border-b border-slate-700 pb-1 focus:outline-none focus:border-slate-500 max-w-[150px]"
                />
                {canRemove && (
                  <Button type="button" variant="ghost" size="icon" className="h-5 w-5 shrink-0 text-slate-700 hover:text-red-600" onClick={() => handleRemoveColumn(colIndex)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="space-y-3 text-sm text-slate-900">
            <div>
              <p className="mb-1">ลงชื่อ</p>
              {readonly ? (
                <p className="border-b border-slate-700 pb-1 min-h-[1.5rem]">
                  {colData.name ? `( ${colData.name} )` : '(  )'}
                </p>
              ) : (
                <select
                  value={users?.find((u) => u.displayName === colData.name)?.id || ''}
                  onChange={(e) => handleUserSelect(colIndex, e.target.value)}
                  className="w-full border-b border-slate-700 bg-transparent pb-1 focus:outline-none text-sm text-slate-900"
                >
                  <option value="">เลือกผู้ตรวจสอบ</option>
                  {users?.filter((u) => u.isApprover).map((u) => (
                    <option key={u.id} value={u.id}>{u.displayName}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <p className="mb-1">ตำแหน่ง</p>
              <p className="border-b border-slate-700 pb-1 min-h-[1.5rem]">
                {colData.signerTitle || ''}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1">วันที่</p>
                {readonly ? (
                  <p className="border-b border-slate-700 pb-1 min-h-[1.5rem]">{colData.date || ''}</p>
                ) : (
                  <input type="date" value={colData.date || ''} onChange={(e) => handleFieldChange(colIndex, 'date', e.target.value)} className="w-full border-b border-slate-700 bg-transparent pb-1 focus:outline-none text-sm" />
                )}
              </div>
              {cfg.showTime && (
                <div>
                  <p className="mb-1">เวลา</p>
                  {readonly ? (
                    <p className="border-b border-slate-700 pb-1 min-h-[1.5rem]">{colData.time || ''}</p>
                  ) : (
                    <input type="time" value={colData.time || ''} onChange={(e) => handleFieldChange(colIndex, 'time', e.target.value)} className="w-full border-b border-slate-700 bg-transparent pb-1 focus:outline-none text-sm" />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    const displayName = colData.name || '';
    const displayTitle = colData.signerTitle || '';
    return (
      <div key={colIndex} className="p-4">
        <div className="mb-4">
          {readonly ? (
            <p className="font-semibold text-sm text-slate-900 text-center">{colTitle}</p>
          ) : (
            <input
              type="text"
              value={colTitle}
              onChange={(e) => handleColTitleChange(colIndex, e.target.value)}
              className="w-full text-center font-semibold text-sm text-slate-900 bg-transparent border-b border-slate-700 pb-1 focus:outline-none focus:border-slate-500"
            />
          )}
        </div>
        <div className="space-y-3 text-sm text-slate-900">
          <div>
            <p className="mb-1">ลงชื่อ</p>
            {readonly ? (
              <p className="border-b border-slate-700 pb-1 min-h-[1.5rem]">
                {displayName ? `( ${displayName} )` : '(  )'}
              </p>
            ) : (
              <select
                value={users?.find((u) => u.displayName === colData.name)?.id || ''}
                onChange={(e) => handleUserSelect(colIndex, e.target.value)}
                className="w-full border-b border-slate-700 bg-transparent pb-1 focus:outline-none text-sm text-slate-900"
              >
                <option value="">เลือกผู้อนุมัติ</option>
                {users?.filter((u) => u.isApprover).map((u) => (
                  <option key={u.id} value={u.id}>{u.displayName}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <p className="mb-1">ตำแหน่ง</p>
            {readonly ? (
              <p className="border-b border-slate-700 pb-1 min-h-[1.5rem]">
                {displayTitle}
              </p>
            ) : (
              <input
                type="text"
                value={colData.signerTitle || ''}
                onChange={(e) => handleFieldChange(colIndex, 'signerTitle', e.target.value)}
                placeholder="ตำแหน่ง"
                className="w-full border-b border-slate-700 bg-transparent pb-1 focus:outline-none text-sm"
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="mb-1">วันที่</p>
              {readonly ? (
                <p className="border-b border-slate-700 pb-1 min-h-[1.5rem]">{colData.date || ''}</p>
              ) : (
                <input type="date" value={colData.date || ''} onChange={(e) => handleFieldChange(colIndex, 'date', e.target.value)} className="w-full border-b border-slate-700 bg-transparent pb-1 focus:outline-none text-sm" />
              )}
            </div>
            {cfg.showTime && (
              <div>
                <p className="mb-1">เวลา</p>
                {readonly ? (
                  <p className="border-b border-slate-700 pb-1 min-h-[1.5rem]">{colData.time || ''}</p>
                ) : (
                  <input type="time" value={colData.time || ''} onChange={(e) => handleFieldChange(colIndex, 'time', e.target.value)} className="w-full border-b border-slate-700 bg-transparent pb-1 focus:outline-none text-sm" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const maxPerRow = totalColumns === 4 ? 2 : 3;
  const rows: number[][] = [];
  for (let i = 0; i < totalColumns; i += maxPerRow) {
    rows.push(Array.from({ length: Math.min(maxPerRow, totalColumns - i) }, (_, j) => i + j));
  }

  return (
    <div>
      <div className="border border-slate-900">
        {rows.map((rowIndices, rowIndex) => {
          const colsInRow = rowIndices.length;
          const gridCols = colsInRow === 2 ? 'grid-cols-2' : colsInRow === 3 ? 'grid-cols-3' : `grid-cols-${colsInRow}`;
          return (
            <div key={rowIndex} className={`grid ${gridCols} divide-x divide-slate-900 ${rowIndex > 0 ? 'border-t border-slate-900' : ''}`}>
              {rowIndices.map((colIdx) => renderColumn(colIdx))}
            </div>
          );
        })}
      </div>
      {!readonly && (
        <div className="mt-2">
          <Button type="button" variant="outline" size="sm" onClick={handleAddColumn}>
            <Plus className="mr-1 h-3 w-3" />
            เพิ่มผู้อนุมัติ
          </Button>
        </div>
      )}
    </div>
  );
}
