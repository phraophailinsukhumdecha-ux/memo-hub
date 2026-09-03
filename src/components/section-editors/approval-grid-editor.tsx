'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ApprovalGridConfig } from '@/types';
import { Plus, X } from 'lucide-react';

interface ApprovalGridEditorProps {
  config: ApprovalGridConfig;
  onChange: (config: ApprovalGridConfig) => void;
}

export function ApprovalGridEditor({ config, onChange }: ApprovalGridEditorProps) {
  const columns = config.columns || [];

  const addColumn = () => {
    onChange({
      ...config,
      columns: [...columns, { title: '', subtitle: '' }],
    });
  };

  const updateColumn = (index: number, updates: Partial<typeof columns[0]>) => {
    const updated = [...columns];
    updated[index] = { ...updated[index], ...updates };
    onChange({ ...config, columns: updated });
  };

  const removeColumn = (index: number) => {
    onChange({ ...config, columns: columns.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">คอลัมน์ลงชื่อ</Label>
          <div className="flex items-center gap-2">
            <Label className="text-xs">แสดงเวลา</Label>
            <Button
              type="button"
              variant={config.showTime ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange({ ...config, showTime: !config.showTime })}
              className="h-7 px-3"
            >
              {config.showTime ? 'เปิด' : 'ปิด'}
            </Button>
          </div>
        </div>
        <p className="text-xs text-slate-500">คอลัมน์ลงชื่อเริ่มต้น — คอลัมน์แยกตามประเภท Memo ตั้งค่าใน เมนู &quot;ตัวเลือกประเภท Memo&quot;</p>

        {columns.map((col, index) => (
          <div key={index} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">คอลัมน์ {index + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeColumn(index)}
                className="h-6 w-6 text-red-500"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">หัวข้อ</Label>
                <Input
                  value={col.title}
                  onChange={(e) => updateColumn(index, { title: e.target.value })}
                  placeholder="หัวข้อคอลัมน์"
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Subtitle</Label>
                <Input
                  value={col.subtitle || ''}
                  onChange={(e) => updateColumn(index, { subtitle: e.target.value })}
                  placeholder="หัวข้อย่อย"
                  className="h-8"
                />
              </div>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addColumn}>
          <Plus className="mr-2 h-4 w-4" />
          เพิ่มคอลัมน์
        </Button>
      </div>
    </div>
  );
}
