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
import { FormRowConfig } from '@/types';
import { Plus, X } from 'lucide-react';

interface FormRowEditorProps {
  config: FormRowConfig;
  onChange: (config: FormRowConfig) => void;
}

export function FormRowEditor({ config, onChange }: FormRowEditorProps) {
  const fields = config.fields || [];

  const addField = () => {
    onChange({
      ...config,
      fields: [...fields, { name: `field_${Date.now()}`, label: '', type: 'text', placeholder: '' }],
    });
  };

  const updateField = (index: number, updates: Partial<typeof fields[0]>) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...updates };
    onChange({ ...config, fields: updated });
  };

  const removeField = (index: number) => {
    onChange({ ...config, fields: fields.filter((_, i) => i !== index) });
  };

  const toggleRequiredByType = (index: number, memoType: string) => {
    const field = fields[index];
    const current = field.requiredByType || [];
    const updated = current.includes(memoType)
      ? current.filter((t) => t !== memoType)
      : [...current, memoType];
    updateField(index, { requiredByType: updated });
  };

  const addOption = (index: number) => {
    const field = fields[index];
    const current = field.options || [];
    updateField(index, { options: [...current, ''] });
  };

  const updateOption = (fieldIndex: number, optionIndex: number, value: string) => {
    const field = fields[fieldIndex];
    const options = [...(field.options || [])];
    options[optionIndex] = value;
    updateField(fieldIndex, { options });
  };

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    const field = fields[fieldIndex];
    const options = (field.options || []).filter((_, i) => i !== optionIndex);
    updateField(fieldIndex, { options });
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">Fields ในแถว</Label>
      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={index} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Field {index + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeField(index)}
                className="h-6 w-6 text-red-500"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Name (key)</Label>
                <Input
                  value={field.name}
                  onChange={(e) => updateField(index, { name: e.target.value })}
                  placeholder="fieldName"
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Label</Label>
                <Input
                  value={field.label}
                  onChange={(e) => updateField(index, { label: e.target.value })}
                  placeholder="ชื่อแสดง"
                  className="h-8"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Type</Label>
                <Select
                  value={field.type}
                  onValueChange={(v) => updateField(index, { type: v as 'text' | 'date' | 'dropdown' })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="dropdown">Dropdown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Placeholder</Label>
                <Input
                  value={field.placeholder || ''}
                  onChange={(e) => updateField(index, { placeholder: e.target.value })}
                  placeholder="ตัวอย่าง"
                  className="h-8"
                />
              </div>
            </div>
            {field.type === 'dropdown' && (
              <div className="space-y-1">
                <Label className="text-xs">Options (แยกด้วย comma)</Label>
                <Input
                  value={(field.options || []).join(', ')}
                  onChange={(e) => updateField(index, { options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  placeholder="ขออนุมัติ, ขอให้ดำเนินการ, ให้ข้อคิดเห็น, แจ้งให้ทราบ"
                  className="h-8"
                />
                <p className="text-xs text-slate-400">แยกตัวเลือกด้วย comma (,)</p>
              </div>
            )}
            <div>
              <Label className="text-xs">บังคับกรอกตามประเภท Memo</Label>
              <div className="flex gap-2 mt-1">
                {['1', '2', '3'].map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant={field.requiredByType?.includes(t) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleRequiredByType(index, t)}
                    className="h-7 px-3"
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addField}>
        <Plus className="mr-2 h-4 w-4" />
        เพิ่ม Field
      </Button>
    </div>
  );
}
