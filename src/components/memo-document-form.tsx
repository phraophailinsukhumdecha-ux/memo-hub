'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { SectionRenderer } from '@/components/memo-sections';
import { MemoTemplate, User } from '@/types';
import { Mail, Save, X } from 'lucide-react';

interface MemoDocumentFormProps {
  template: MemoTemplate;
  formData: Record<string, unknown>;
  onChange: (fieldId: string, value: unknown) => void;
  onSubmit: (sendEmail: boolean) => void;
  onCancel: () => void;
  creating: boolean;
  ownerUser: User | null;
  users: User[];
}

export function MemoDocumentForm({
  template,
  formData,
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
        {/* Document */}
        <div className="bg-white border-2 border-slate-900 shadow-lg">
          {/* MEMO Header */}
          <div className="border-b-2 border-slate-900 py-3 text-center">
            <h1 className="text-2xl font-bold tracking-[0.3em] text-slate-900">MEMO</h1>
          </div>

          {/* Document Body */}
          <div className="p-6 space-y-0">
            {template.fields.filter((f) => f.type !== 'memo_type').map((field) => (
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

        {/* Action Buttons */}
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
      </div>
    </div>
  );
}
