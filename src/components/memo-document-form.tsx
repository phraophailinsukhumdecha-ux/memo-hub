'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SectionRenderer } from '@/components/memo-sections';
import { MemoTemplate, User } from '@/types';
import { Mail, Save, X } from 'lucide-react';

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

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-slate-900">สร้าง Memo ใหม่</h2>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Memo Document */}
        <div className="p-6">
          <div className="border-2 border-slate-900">
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
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex items-center justify-end gap-2">
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
