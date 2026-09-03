'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CheckboxGroupConfig } from '@/types';
import { Plus, X } from 'lucide-react';

interface CheckboxGroupEditorProps {
  config: CheckboxGroupConfig;
  onChange: (config: CheckboxGroupConfig) => void;
}

export function CheckboxGroupEditor({ config, onChange }: CheckboxGroupEditorProps) {
  const options = config.options || [];

  const addOption = () => {
    onChange({ ...config, options: [...options, ''] });
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    onChange({ ...config, options: updated });
  };

  const removeOption = (index: number) => {
    onChange({ ...config, options: options.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">ตัวเลือก Checkboxes</Label>
      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              placeholder={`ตัวเลือกที่ ${index + 1}`}
              className="flex-1"
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
