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
import { Badge } from '@/components/ui/badge';
import { MemoField, MemoFieldType, CheckboxGroupConfig, DropdownSelectConfig, MemoTypeConfig, FormRowConfig, BodyTextConfig, ApprovalGridConfig } from '@/types';
import { CheckboxGroupEditor } from './checkbox-group-editor';
import { DropdownSelectEditor } from './dropdown-select-editor';
import { MemoTypeEditor } from './memo-type-editor';
import { FormRowEditor } from './form-row-editor';
import { BodyTextEditor } from './body-text-editor';
import { ApprovalGridEditor } from './approval-grid-editor';
import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react';

interface SectionEditorPanelProps {
  field: MemoField;
  index: number;
  totalFields: number;
  onUpdate: (updates: Partial<MemoField>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export const SECTION_TYPES: { value: MemoFieldType; label: string }[] = [
  { value: 'section_title', label: 'หัวข้อ (MEMO)' },
  { value: 'company_header', label: 'ข้อมูลบริษัท + โลโก้' },
  { value: 'dropdown_select', label: 'Dropdown (เลือกตัวเดียว)' },
  { value: 'checkbox_group', label: 'Checkboxes (เลือกหลายตัว)' },
  { value: 'memo_type', label: 'ประเภท Memo' },
  { value: 'form_row', label: 'ฟอร์ม 2 คอลัมน์' },
  { value: 'body_text', label: 'ข้อความ / บรรทัดว่าง' },
  { value: 'approval_grid', label: 'ลงชื่ออนุมัติ' },
];

export function SectionEditorPanel({
  field,
  index,
  totalFields,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: SectionEditorPanelProps) {
  const renderConfigEditor = () => {
    switch (field.type) {
      case 'checkbox_group':
        return (
          <CheckboxGroupEditor
            config={(field.fieldConfig as unknown as CheckboxGroupConfig) || { options: [] }}
            onChange={(config) => onUpdate({ fieldConfig: config })}
          />
        );
      case 'dropdown_select':
        return (
          <DropdownSelectEditor
            config={(field.fieldConfig as unknown as DropdownSelectConfig) || { options: [] }}
            onChange={(config) => onUpdate({ fieldConfig: config })}
          />
        );
      case 'memo_type':
        return (
          <MemoTypeEditor
            config={(field.fieldConfig as unknown as MemoTypeConfig) || { options: [] }}
            onChange={(config) => onUpdate({ fieldConfig: config })}
          />
        );
      case 'form_row':
        return (
          <FormRowEditor
            config={(field.fieldConfig as unknown as FormRowConfig) || { fields: [] }}
            onChange={(config) => onUpdate({ fieldConfig: config })}
          />
        );
      case 'body_text':
        return (
          <BodyTextEditor
            config={(field.fieldConfig as unknown as BodyTextConfig) || { lines: 12 }}
            onChange={(config) => onUpdate({ fieldConfig: config })}
          />
        );
      case 'approval_grid':
        return (
          <ApprovalGridEditor
            config={(field.fieldConfig as unknown as ApprovalGridConfig) || { columns: [] }}
            onChange={(config) => onUpdate({ fieldConfig: config })}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="rounded-lg border bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">#{index + 1}</span>
          <Badge variant="secondary" className="text-xs font-medium">
            {SECTION_TYPES.find((st) => st.value === field.type)?.label || field.type}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onMoveUp}
            disabled={index === 0}
            className="h-7 w-7"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onMoveDown}
            disabled={index === totalFields - 1}
            className="h-7 w-7"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-7 w-7 text-red-500 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div>
        <Label className="text-xs">Label</Label>
        <Input
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="ชื่อ section"
          className="h-8"
        />
      </div>

      {renderConfigEditor()}
    </div>
  );
}
