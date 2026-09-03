'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MemoTypeConfig } from '@/types';
import { Plus, X } from 'lucide-react';

interface MemoTypeEditorProps {
  config: MemoTypeConfig;
  onChange: (config: MemoTypeConfig) => void;
}

export function MemoTypeEditor({ config, onChange }: MemoTypeEditorProps) {
  const options = config.options || [];

  const addOption = () => {
    onChange({ ...config, options: [...options, { value: String(options.length + 1), label: '' }] });
  };

  const updateOption = (index: number, updates: Partial<typeof options[0]>) => {
    const updated = [...options];
    updated[index] = { ...updated[index], ...updates };
    onChange({ ...config, options: updated });
  };

  const removeOption = (index: number) => {
    onChange({ ...config, options: options.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">ตัวเลือกประเภท Memo</Label>
      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={option.value}
              onChange={(e) => updateOption(index, { value: e.target.value })}
              placeholder="ค่า"
              className="w-16 h-8"
            />
            <Input
              value={option.label}
              onChange={(e) => updateOption(index, { label: e.target.value })}
              placeholder="ชื่อประเภท"
              className="flex-1 h-8"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeOption(index)}
              className="h-8 w-8 text-red-500"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addOption}>
        <Plus className="mr-2 h-4 w-4" />
        เพิ่มตัวเลือก
      </Button>
    </div>
  );
}
