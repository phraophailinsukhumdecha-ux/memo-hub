'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MemoField, CheckboxGroupConfig, DropdownSelectConfig, MemoTypeConfig, FormRowConfig, BodyTextConfig, ApprovalGridConfig } from '@/types';
import { CheckboxGroupEditor } from './checkbox-group-editor';
import { DropdownSelectEditor } from './dropdown-select-editor';
import { MemoTypeEditor } from './memo-type-editor';
import { FormRowEditor } from './form-row-editor';
import { BodyTextEditor } from './body-text-editor';
import { ApprovalGridEditor } from './approval-grid-editor';

interface SectionConfigEditorProps {
  field: MemoField;
  onUpdate: (updates: Partial<MemoField>) => void;
}

export function SectionConfigEditor({ field, onUpdate }: SectionConfigEditorProps) {
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
    <div className="space-y-3">
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
