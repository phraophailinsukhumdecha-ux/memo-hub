'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MemoTypography } from '@/types';
import { DEFAULT_TYPOGRAPHY, FONT_PRESETS } from '@/lib/typography';

interface TypographyEditorProps {
  value?: MemoTypography | null;
  onChange: (value: MemoTypography) => void;
  showReset?: boolean;
}

const ALIGN_OPTIONS = [
  { v: 'left', label: 'ชิดซ้าย' },
  { v: 'center', label: 'กึ่งกลาง' },
  { v: 'right', label: 'ชิดขวา' },
  { v: 'justify', label: 'เต็มบรรทัด' },
] as const;

/**
 * Per-section typography editor. Empty values inherit from the template default.
 */
export function TypographyEditor({ value, onChange, showReset }: TypographyEditorProps) {
  const v = value || {};
  const set = (patch: Partial<MemoTypography>) => onChange({ ...v, ...patch });

  return (
    <div className="space-y-3 rounded-lg border bg-slate-50/50 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-600">รูปแบบตัวอักษร section นี้ (ว่าง = ใช้ค่าของเทมเพลต)</p>
        {showReset && (
          <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => onChange({})}>
            ล้างค่า
          </Button>
        )}
      </div>
      <div className="space-y-1">
        <Label className="text-xs">ฟอนต์</Label>
        <Select
          value={v.fontFamily ? (FONT_PRESETS.some((p) => p.value === v.fontFamily) ? v.fontFamily : '__custom__') : '__inherit__'}
          onValueChange={(sel) => {
            if (sel === '__inherit__') {
              const next = { ...v };
              delete next.fontFamily;
              onChange(next);
            } else if (sel === '__custom__') {
              set({ fontFamily: '' });
            } else {
              set({ fontFamily: sel });
            }
          }}
        >
          <SelectTrigger className="h-8"><SelectValue placeholder="ใช้ค่าของเทมเพลต" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__inherit__">ใช้ค่าของเทมเพลต</SelectItem>
            {FONT_PRESETS.map((p) => (
              <SelectItem key={p.label} value={p.value}>{p.label}</SelectItem>
            ))}
            <SelectItem value="__custom__">กำหนดเอง...</SelectItem>
          </SelectContent>
        </Select>
        {v.fontFamily !== undefined && !FONT_PRESETS.some((p) => p.value === v.fontFamily) && (
          <Input
            className="h-8 text-xs"
            placeholder='"Sukhumvit Set", sans-serif'
            value={v.fontFamily}
            onChange={(e) => set({ fontFamily: e.target.value })}
          />
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">ขนาดฟอนต์ (px)</Label>
          <Input
            type="number" min={10} max={24} className="h-8"
            placeholder={String(DEFAULT_TYPOGRAPHY.baseFontSize)}
            value={v.baseFontSize ?? ''}
            onChange={(e) => {
              const n = Number(e.target.value);
              const next = { ...v };
              if (!e.target.value) delete next.baseFontSize;
              else next.baseFontSize = n;
              onChange(next);
            }}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">ระยะบรรทัด</Label>
          <Input
            type="number" min={1} max={3} step={0.1} className="h-8"
            placeholder={String(DEFAULT_TYPOGRAPHY.lineHeight)}
            value={v.lineHeight ?? ''}
            onChange={(e) => {
              const n = Number(e.target.value);
              const next = { ...v };
              if (!e.target.value) delete next.lineHeight;
              else next.lineHeight = n;
              onChange(next);
            }}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">จัดแนวข้อความ</Label>
        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            variant={!v.textAlign ? 'default' : 'outline'}
            size="sm" className="h-7 text-xs"
            onClick={() => {
              if (!v.textAlign) return;
              const next = { ...v };
              delete next.textAlign;
              onChange(next);
            }}
            title="ใช้ค่าตามเทมเพลต"
          >
            ตามเทมเพลต
          </Button>
          {ALIGN_OPTIONS.map((o) => (
            <Button
              key={o.v}
              type="button"
              variant={v.textAlign === o.v ? 'default' : 'outline'}
              size="sm" className="h-7 text-xs"
              onClick={() => set({ textAlign: o.v })}
            >
              {o.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-slate-900 cursor-pointer">
          <input
            type="checkbox"
            checked={v.boldLabels ?? false}
            onChange={(e) => set({ boldLabels: e.target.checked })}
            className="h-4 w-4 rounded"
          />
          หัวข้อตัวหนา
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-900 cursor-pointer">
          <input
            type="checkbox"
            checked={v.boldBody ?? false}
            onChange={(e) => set({ boldBody: e.target.checked })}
            className="h-4 w-4 rounded"
          />
          เนื้อหาตัวหนา
        </label>
      </div>
    </div>
  );
}
