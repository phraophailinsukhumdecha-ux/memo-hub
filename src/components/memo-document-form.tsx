'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApprovalGrid, SectionRenderer } from '@/components/memo-sections';
import { MemoTemplate, User, Group, ApprovalGridConfig } from '@/types';
import { Mail, Save, X } from 'lucide-react';
import { generateMemoIdClient } from '@/utils/cn';

interface MemoDocumentFormProps {
  templates: MemoTemplate[];
  selectedTemplate: MemoTemplate | null;
  formData: Record<string, unknown>;
  onSelectTemplate: (template: MemoTemplate) => void;
  onChange: (fieldId: string, value: unknown) => void;
  onSubmit: (sendEmail: boolean) => void;
  onCancel: () => void;
  creating: boolean;
  ownerUser: User | null;
  users: User[];
}

export function MemoDocumentForm({
  templates,
  selectedTemplate,
  formData,
  onSelectTemplate,
  onChange,
  onSubmit,
  onCancel,
  creating,
  ownerUser,
  users,
}: MemoDocumentFormProps) {
  useEffect(() => {
    if (!selectedTemplate && templates.length > 0) {
      onSelectTemplate(templates[0]);
    }
  }, [selectedTemplate, templates, onSelectTemplate]);

  useEffect(() => {
    if (selectedTemplate) {
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      for (const field of selectedTemplate.fields) {
        if (field.type === 'form_row') {
          const config = (field.fieldConfig || {}) as Record<string, unknown>;
          const fields = (config?.fields as Array<{ name: string }>) || [];
          const hasDate = fields.some((f) => f.name.toLowerCase().includes('date') || f.name === 'date');
          if (hasDate) {
            const currentVal = (formData[field.id] as Record<string, string>) || {};
            if (!currentVal.date) {
              onChange(field.id, { ...currentVal, date: dateStr });
            }
          }
        }
      }
    }
  }, [selectedTemplate]);

  if (!selectedTemplate) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 text-center">
          <p className="text-slate-500">ไม่มีเทมเพลตให้เลือก</p>
          <Button variant="outline" className="mt-4" onClick={onCancel}>ปิด</Button>
        </div>
      </div>
    );
  }

  const renderField = (field: { id: string; name: string; label: string; type: string; required?: boolean; fieldConfig?: unknown }) => {
    const config = (field.fieldConfig || {}) as Record<string, unknown>;

    switch (field.type) {
      case 'form_row': {
        const fields = (config?.fields as Array<{ name: string; label: string; type: string; placeholder?: string }>) || [];
        const value = (formData[field.id] as Record<string, string>) || {};
        const checkboxField = selectedTemplate.fields.find((f) => f.type === 'checkbox_group');
        const checkboxConfig = checkboxField ? (checkboxField.fieldConfig || {}) as Record<string, unknown> : null;
        const checkboxOptions = (checkboxConfig?.options as string[]) || [];
        const checkboxValue = checkboxField ? (formData[checkboxField.id] as string[]) || [] : [];

        return (
          <div key={field.id} className="space-y-3">
            {fields.map((f) => (
              <div key={f.name} className="space-y-1">
                <Label className="text-sm font-medium text-slate-700">{f.label}</Label>
                {f.type === 'date' ? (
                  <Input
                    type="date"
                    value={value[f.name] || ''}
                    onChange={(e) => onChange(field.id, { ...value, [f.name]: e.target.value })}
                  />
                ) : (
                  <Input
                    value={value[f.name] || ''}
                    onChange={(e) => onChange(field.id, { ...value, [f.name]: e.target.value })}
                    placeholder={f.placeholder || ''}
                  />
                )}
              </div>
            ))}
            {checkboxField && checkboxOptions.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-2">
                {checkboxOptions.map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkboxValue.includes(opt)}
                      onChange={() => {
                        const newVal = checkboxValue.includes(opt)
                          ? checkboxValue.filter((v) => v !== opt)
                          : [...checkboxValue, opt];
                        onChange(checkboxField.id, newVal);
                      }}
                      className="h-4 w-4 rounded"
                    />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'body_text': {
        const lines = (config?.lines as number) || 12;
        const content = (formData[field.id] as string) || '';
        return (
          <div key={field.id} className="space-y-1">
            <Label className="text-sm font-medium text-slate-700">{field.label}</Label>
            <Textarea
              value={content}
              onChange={(e) => onChange(field.id, e.target.value)}
              placeholder="กรอกเนื้อหา..."
              className="min-h-[150px]"
              style={{ minHeight: `${lines * 1.5}rem` }}
            />
          </div>
        );
      }

      case 'checkbox_group':
        return null;

      case 'dropdown_select': {
        const options = (config?.options as string[]) || [];
        const placeholder = (config?.placeholder as string) || 'เลือก';
        const value = (formData[field.id] as string) || '';
        return (
          <div key={field.id} className="space-y-1">
            <Label className="text-sm font-medium text-slate-700">{field.label}</Label>
            <Select value={value} onValueChange={(val) => onChange(field.id, val)}>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      }

      case 'approval_grid': {
        const gridConfig = config as unknown as ApprovalGridConfig;
        return (
          <div key={field.id} className="space-y-1">
            <Label className="text-sm font-medium text-slate-700">{field.label}</Label>
            <ApprovalGrid
              config={gridConfig}
              value={formData[field.id] as Record<string, { name?: string; userId?: string; signed?: boolean; date?: string; time?: string; signerTitle?: string; colTitle?: string }> | undefined}
              onChange={(val) => onChange(field.id, val)}
              readonly={false}
              ownerUser={ownerUser}
              users={users}
            />
          </div>
        );
      }

      case 'section_title':
      case 'company_header':
      case 'memo_type':
        return null;

      default:
        return (
          <div key={field.id} className="space-y-1">
            <Label className="text-sm font-medium text-slate-700">{field.label}</Label>
            <Input
              value={(formData[field.id] as string) || ''}
              onChange={(e) => onChange(field.id, e.target.value)}
            />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-2xl w-[95vw] max-w-[1400px] h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="shrink-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">สร้าง Memo ใหม่</h2>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Split Panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Form Fields */}
          <div className="w-1/2 overflow-y-auto border-r">
            <div className="p-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">กรอกข้อมูล Memo</h3>
              {selectedTemplate.fields.filter((f) => f.type !== 'memo_type' && f.type !== 'section_title' && f.type !== 'company_header').map((field) => renderField(field))}
              <div className="space-y-1">
                <Label className="text-sm font-medium text-slate-700">REF. NO.</Label>
                <Input
                  value={(formData.refNo as string) || ''}
                  onChange={(e) => onChange('refNo', e.target.value)}
                  placeholder="เลขที่อ้างอิง (ถ้ามี)"
                />
              </div>
            </div>
          </div>

          {/* Right: Memo Preview */}
          <div className="w-1/2 overflow-y-auto bg-slate-100 p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">ตัวอย่าง Memo</h3>
            <div className="bg-white border-2 border-slate-900 text-sm">
              <div className="p-4 space-y-0">
                {selectedTemplate.fields.filter((f) => f.type !== 'memo_type' && f.type !== 'section_title').map((field) => (
                  <SectionRenderer
                    key={field.id}
                    field={field}
                    value={formData[field.id]}
                    formData={{
                      ...formData as Record<string, unknown>,
                      memoNumber: generateMemoIdClient(ownerUser?.department || ''),
                    }}
                    readonly={true}
                    ownerUser={ownerUser}
                    users={users}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 bg-white border-t px-6 py-4 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={creating}>
            ยกเลิก
          </Button>
          <Button variant="outline" onClick={() => onSubmit(true)} disabled={creating}>
            <Mail className="h-4 w-4 mr-1" />
            {creating ? 'กำลังสร้าง...' : 'สร้าง Memo และส่งอีเมล'}
          </Button>
          <Button onClick={() => onSubmit(false)} disabled={creating} className="bg-slate-900 hover:bg-slate-800">
            <Save className="h-4 w-4 mr-1" />
            {creating ? 'กำลังสร้าง...' : 'สร้าง Memo'}
          </Button>
        </div>
      </div>
    </div>
  );
}
