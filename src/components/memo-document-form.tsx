'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SectionRenderer } from '@/components/memo-sections';
import { MemoTemplate, User } from '@/types';
import { Mail, Save, X, ArrowLeft } from 'lucide-react';

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
  return (
    <div className="min-h-screen bg-slate-200 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Template Selector */}
        {!selectedTemplate && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Button variant="ghost" size="icon" onClick={onCancel}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h2 className="text-xl font-bold text-slate-900">สร้าง Memo ใหม่</h2>
            </div>
            <p className="text-sm text-slate-600 mb-4">เลือกประเภท Memo</p>
            {templates.length === 0 && <p className="text-center text-slate-500 py-4">ยังไม่มีเทมเพลต</p>}
            {templates.length > 0 && (
              <Select onValueChange={(val) => {
                const t = templates.find((x) => x.id === val);
                if (t) onSelectTemplate(t);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกเทมเพลต" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Memo Document */}
        {selectedTemplate && (
          <div className="bg-white border-2 border-slate-900 shadow-lg">
            {/* MEMO Header */}
            <div className="border-b-2 border-slate-900 py-3 text-center">
              <h1 className="text-2xl font-bold tracking-[0.3em] text-slate-900">MEMO</h1>
            </div>

            {/* Document Body */}
            <div className="p-6 space-y-0">
              {selectedTemplate.fields.filter((f) => f.type !== 'memo_type').map((field) => (
                <SectionRenderer
                  key={field.id}
                  field={field}
                  value={formData[field.id]}
                  readonly={false}
                  ownerUser={ownerUser}
                  users={users}
                  onChange={(val) => onChange(field.id, val)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {selectedTemplate && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <Button variant="outline" onClick={onCancel} disabled={creating} className="bg-white">
              <X className="h-4 w-4 mr-1" />
              ยกเลิก
            </Button>
            <Button onClick={() => onSubmit(false)} disabled={creating} className="bg-slate-900 hover:bg-slate-800">
              <Save className="h-4 w-4 mr-1" />
              {creating ? 'กำลังสร้าง...' : 'สร้าง Memo'}
            </Button>
            <Button onClick={() => onSubmit(true)} disabled={creating} className="bg-blue-600 hover:bg-blue-700">
              <Mail className="h-4 w-4 mr-1" />
              {creating ? 'กำลังสร้าง...' : 'สร้าง Memo และส่งอีเมล'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
