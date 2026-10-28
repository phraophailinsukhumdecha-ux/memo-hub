'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ApprovalGridConfig, User, Group, MemoTypography } from '@/types';
import { resolveTypography } from '@/lib/typography';
import { Plus, X } from 'lucide-react';

interface ApprovalGridProps {
  config?: ApprovalGridConfig;
  value?: Record<string, { name?: string; userId?: string; signed?: boolean; date?: string; time?: string; signerTitle?: string; colTitle?: string; action?: string }>;
  onChange?: (value: Record<string, { name?: string; userId?: string; signed?: boolean; date?: string; time?: string; signerTitle?: string; colTitle?: string; action?: string }>) => void;
  readonly?: boolean;
  memoType?: string;
  globalMemoTypeColumns?: { memoType: string; columns: { title: string; subtitle?: string }[] }[];
  ownerUser?: User | null;
  users?: User[];
  groups?: Group[];
  attnToUserIds?: string[];
  auditorUserIds?: string[];
  typography?: MemoTypography;
}

const DEFAULT_CONFIG: ApprovalGridConfig = {
  columns: [
    { title: 'ผู้ขออนุมัติ', subtitle: '' },
    { title: 'ผู้ตรวจสอบ', subtitle: '' },
    { title: 'ผู้อนุมัติ', subtitle: '' },
  ],
};

export function ApprovalGrid({ config, value = {}, onChange, readonly, memoType, globalMemoTypeColumns, ownerUser, users, attnToUserIds, auditorUserIds, typography }: ApprovalGridProps) {
  const cfg = config || DEFAULT_CONFIG;
  const typo = resolveTypography(typography);
  const cellTextStyle: React.CSSProperties = {
    fontFamily: typo.fontFamily,
    fontSize: `${typo.baseFontSize}px`,
    lineHeight: typo.lineHeight,
  };

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

  const hasDynamicAssignments = Boolean(
    ownerUser || (attnToUserIds && attnToUserIds.length > 0) || (auditorUserIds && auditorUserIds.length > 0)
  );

  // Ordered user assignment for col_1+:
  // 1. All Checked by users (ผู้ตรวจสอบ)
  // 2. All ATTN TO users (ผู้อนุมัติ)
  const assignedUsers = (() => {
    if (!users) return [];
    const list: { id: string; displayName: string; position?: string; roleType: 'auditor' | 'approver' }[] = [];
    for (const audId of auditorUserIds || []) {
      const u = users.find((x) => x.id === audId);
      if (u) list.push({ ...u, roleType: 'auditor' });
    }
    for (const attnId of attnToUserIds || []) {
      const u = users.find((x) => x.id === attnId);
      if (u) list.push({ ...u, roleType: 'approver' });
    }
    return list;
  })();

  const resolveAssigned = (colIndex: number) => {
    if (colIndex <= 0) return null;
    return assignedUsers[colIndex - 1] || null;
  };

  // Auto-populate columns: col_0 = ผู้ขออนุมัติ, then ผู้ตรวจสอบ all, then ผู้อนุมัติ all
  useEffect(() => {
    if (readonly || !onChange) return;
    if (!hasDynamicAssignments) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });

    const autoValue: typeof value = {};
    let idx = 0;
    // col_0: owner (ผู้ขออนุมัติ)
    if (ownerUser) {
      autoValue[`col_${idx}`] = {
        ...value[`col_${idx}`],
        name: ownerUser.displayName,
        userId: ownerUser.id,
        signerTitle: ownerUser.position || '',
        colTitle: 'ผู้ขออนุมัติ',
        date: value[`col_${idx}`]?.date || todayStr,
        time: value[`col_${idx}`]?.time || timeStr,
      };
      idx++;
    }
    // col_1+: Checked by (ผู้ตรวจสอบ)
    for (const audId of auditorUserIds || []) {
      const audUser = users?.find((u) => u.id === audId);
      if (audUser) {
        autoValue[`col_${idx}`] = {
          ...value[`col_${idx}`],
          name: audUser.displayName,
          userId: audUser.id,
          signerTitle: audUser.position || '',
          colTitle: 'ผู้ตรวจสอบ',
          date: value[`col_${idx}`]?.date || todayStr,
          time: value[`col_${idx}`]?.time || timeStr,
        };
        idx++;
      }
    }
    // col_n+: ATTN TO (ผู้อนุมัติ)
    for (const attnId of attnToUserIds || []) {
      const attnUser = users?.find((u) => u.id === attnId);
      if (attnUser) {
        autoValue[`col_${idx}`] = {
          ...value[`col_${idx}`],
          name: attnUser.displayName,
          userId: attnUser.id,
          signerTitle: attnUser.position || '',
          colTitle: 'ผู้อนุมัติ',
          date: value[`col_${idx}`]?.date || todayStr,
          time: value[`col_${idx}`]?.time || timeStr,
        };
        idx++;
      }
    }

    // Compare with current value before updating to avoid unnecessary re-renders
    const curKeys = Object.keys(value).filter((k) => k.startsWith('col_'));
    const newKeys = Object.keys(autoValue);
    let changed = curKeys.length !== newKeys.length;
    if (!changed) {
      for (const k of newKeys) {
        const cur = value[k];
        const next = autoValue[k];
        if (
          cur?.name !== next?.name ||
          cur?.userId !== next?.userId ||
          cur?.signerTitle !== next?.signerTitle ||
          cur?.colTitle !== next?.colTitle
        ) {
          changed = true;
          break;
        }
      }
    }

    if (changed) {
      onChange(autoValue);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerUser?.id, (attnToUserIds || []).join(','), (auditorUserIds || []).join(',')]);

  const colIndices = Object.keys(value)
    .filter((k) => k.startsWith('col_'))
    .map((k) => parseInt(k.split('_')[1]))
    .sort((a, b) => a - b);

  const requiredColumns = (ownerUser ? 1 : 0) + assignedUsers.length;
  const totalColumns = hasDynamicAssignments
    ? Math.max(colIndices.length, requiredColumns)
    : Math.max(colIndices.length, configColumns.length, 1);
  const lastIndex = totalColumns - 1;
  const canRemove = !hasDynamicAssignments && totalColumns > 3;

  const getColTitle = (colIndex: number) => {
    const colData = value[`col_${colIndex}`] || {};
    if (colData.colTitle) {
      if (colData.colTitle === 'Checked by') return 'ผู้ตรวจสอบ';
      if (colData.colTitle === 'อนุมัติ') return 'ผู้อนุมัติ';
      return colData.colTitle;
    }
    if (colIndex === 0) return 'ผู้ขออนุมัติ';
    const assigned = resolveAssigned(colIndex);
    if (assigned) {
      return assigned.roleType === 'auditor' ? 'ผู้ตรวจสอบ' : 'ผู้อนุมัติ';
    }
    const cfgTitle = configColumns[colIndex]?.title;
    if (cfgTitle === 'Checked by') return 'ผู้ตรวจสอบ';
    if (cfgTitle === 'อนุมัติ') return 'ผู้อนุมัติ';
    return cfgTitle || 'ผู้อนุมัติ';
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
    const signerTitle = colIndex === lastIndex ? (selectedUser.position || '') : (selectedUser.position || '');
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

    const colTitle = getColTitle(colIndex);

    if (isFirst) {
      const displayName = ownerUser?.displayName || colData.name || '';
      const displayTitle = ownerUser?.position || colData.signerTitle || '';
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
          <div className="text-slate-900" style={{ ...cellTextStyle, display: 'flex', flexDirection: 'column', gap: '12px' }}>
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

    // colIndex > 0: Checkers (ผู้ตรวจสอบ) and Approvers (ผู้อนุมัติ)
    const assigned = resolveAssigned(colIndex);
    let resolvedName = colData.name || '';
    let resolvedTitle = colData.signerTitle || '';
    if (assigned) {
      resolvedName = assigned.displayName;
      resolvedTitle = assigned.position || '';
    }

    const placeholderSelect = assigned?.roleType === 'auditor' ? 'เลือกผู้ตรวจสอบ' : 'เลือกผู้อนุมัติ';

    return (
      <div key={colIndex} className="p-4 relative">
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
              {canRemove && colIndex < lastIndex && (
                <Button type="button" variant="ghost" size="icon" className="h-5 w-5 shrink-0 text-slate-700 hover:text-red-600" onClick={() => handleRemoveColumn(colIndex)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
        <div className="text-slate-900" style={{ ...cellTextStyle, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <p className="mb-1">ลงชื่อ</p>
            {readonly ? (
              <p className="border-b border-slate-700 pb-1 min-h-[1.5rem]">
                {resolvedName ? `( ${resolvedName} )` : '(  )'}
              </p>
            ) : (
              <select
                value={users?.find((u) => u.displayName === (colData.name || resolvedName))?.id || ''}
                onChange={(e) => handleUserSelect(colIndex, e.target.value)}
                className="w-full border-b border-slate-700 bg-transparent pb-1 focus:outline-none text-sm text-slate-900"
              >
                <option value="">{placeholderSelect}</option>
                {users?.map((u) => (
                  <option key={u.id} value={u.id}>{u.displayName}</option>
                ))}
              </select>
            )}
          </div>
          {readonly && colData.action && (
            <div className={`text-center py-1 px-2 rounded text-xs font-bold ${colData.action === 'approve' ? 'text-green-700 bg-green-50 border border-green-200' : 'text-red-700 bg-red-50 border border-red-200'}`}>
              {colData.action === 'approve' ? '✓ อนุมัติ' : '✗ ไม่อนุมัติ'}
              {colData.date && <span className="font-normal ml-1">{colData.date}</span>}
              {colData.time && <span className="font-normal ml-1">{colData.time}</span>}
            </div>
          )}
          <div>
            <p className="mb-1">ตำแหน่ง</p>
            {readonly ? (
              <p className="border-b border-slate-700 pb-1 min-h-[1.5rem]">
                {resolvedTitle}
              </p>
            ) : (
              <input
                type="text"
                value={colData.signerTitle || resolvedTitle || ''}
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
    <div style={{ fontFamily: typo.fontFamily }}>
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
