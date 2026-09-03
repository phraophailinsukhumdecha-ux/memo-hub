'use client';

import React from 'react';
import { MemoField, CompanyHeaderConfig, CheckboxGroupConfig, DropdownSelectConfig, MemoTypeConfig, FormRowConfig, BodyTextConfig, ApprovalGridConfig, User, Group } from '@/types';
import { SectionTitle } from './section-title';
import { CompanyHeader } from './company-header';
import { CheckboxGroup } from './checkbox-group';
import { DropdownSelect } from './dropdown-select';
import { MemoType } from './memo-type';
import { FormRow } from './form-row';
import { BodyText } from './body-text';
import { ApprovalGrid } from './approval-grid';

interface SectionRendererProps {
  field: MemoField;
  value?: unknown;
  onChange?: (value: unknown) => void;
  readonly?: boolean;
  memoType?: string;
  globalMemoTypeColumns?: { memoType: string; columns: { title: string; subtitle?: string }[] }[];
  ownerUser?: User | null;
  users?: User[];
  groups?: Group[];
}

export function SectionRenderer({ field, value, onChange, readonly, memoType, globalMemoTypeColumns, ownerUser, users, groups }: SectionRendererProps) {
  switch (field.type) {
    case 'section_title':
      return <SectionTitle label={field.label} readonly={readonly} />;

    case 'company_header':
      return (
        <CompanyHeader
          config={field.fieldConfig as CompanyHeaderConfig | undefined}
          readonly={readonly}
        />
      );

    case 'checkbox_group':
      return (
        <CheckboxGroup
          config={field.fieldConfig as CheckboxGroupConfig | undefined}
          value={value as string[] | undefined}
          onChange={onChange as ((value: string[]) => void) | undefined}
          readonly={readonly}
        />
      );

    case 'dropdown_select':
      return (
        <DropdownSelect
          config={field.fieldConfig as DropdownSelectConfig | undefined}
          value={value as string | undefined}
          onChange={onChange as ((value: string) => void) | undefined}
          readonly={readonly}
          label={field.label}
        />
      );

    case 'memo_type':
      return (
        <MemoType
          config={field.fieldConfig as MemoTypeConfig | undefined}
          value={value as string | undefined}
          onChange={onChange as ((value: string) => void) | undefined}
          readonly={readonly}
          label={field.label}
        />
      );

    case 'form_row':
      return (
        <FormRow
          config={field.fieldConfig as FormRowConfig | undefined}
          value={value as Record<string, string> | undefined}
          onChange={onChange as ((value: Record<string, string>) => void) | undefined}
          readonly={readonly}
          memoType={memoType}
        />
      );

    case 'body_text':
      return (
        <BodyText
          config={field.fieldConfig as BodyTextConfig | undefined}
          value={value as string | undefined}
          onChange={onChange as ((value: string) => void) | undefined}
          readonly={readonly}
        />
      );

    case 'approval_grid':
      return (
        <ApprovalGrid
          config={field.fieldConfig as ApprovalGridConfig | undefined}
          value={value as Record<string, { name?: string; signed?: boolean; date?: string; time?: string }> | undefined}
          onChange={onChange as ((value: Record<string, { name?: string; signed?: boolean; date?: string; time?: string }>) => void) | undefined}
          readonly={readonly}
          memoType={memoType}
          globalMemoTypeColumns={globalMemoTypeColumns}
          ownerUser={ownerUser}
          users={users}
          groups={groups}
        />
      );

    default:
      return (
        <div className="border border-slate-900 p-3">
          <p className="text-sm text-slate-500">Unknown section type: {field.type}</p>
        </div>
      );
  }
}
