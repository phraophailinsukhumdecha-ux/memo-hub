'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AttachmentSectionConfig } from '@/types';

interface AttachmentEditorProps {
  config: AttachmentSectionConfig;
  onChange: (config: AttachmentSectionConfig) => void;
}

export function AttachmentEditor({ config, onChange }: AttachmentEditorProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">จำนวนไฟล์สูงสุด</Label>
          <Input
            type="number"
            value={config.maxFiles ?? 5}
            onChange={(e) => onChange({ ...config, maxFiles: parseInt(e.target.value) || 1 })}
            min={1}
            max={20}
            className="h-8"
          />
        </div>
        <div>
          <Label className="text-xs">ขนาดสูงสุด (MB)</Label>
          <Input
            type="number"
            value={config.maxSizeMB ?? 10}
            onChange={(e) => onChange({ ...config, maxSizeMB: parseInt(e.target.value) || 1 })}
            min={1}
            max={10}
            className="h-8"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">ข้อความช่วยเหลือ (ถ้ามี)</Label>
        <Input
          value={config.helperText || ''}
          onChange={(e) => onChange({ ...config, helperText: e.target.value })}
          placeholder="เช่น แนบใบเสนอราคาและรูปถ่ายหน้างาน"
          className="h-8"
        />
      </div>

      <label className="flex items-center gap-2 text-xs text-slate-700">
        <input
          type="checkbox"
          checked={config.required ?? false}
          onChange={(e) => onChange({ ...config, required: e.target.checked })}
          className="h-4 w-4 rounded"
        />
        บังคับแนบไฟล์อย่างน้อย 1 ไฟล์
      </label>

      <label className="flex items-center gap-2 text-xs text-slate-700">
        <input
          type="checkbox"
          checked={config.showInDocument ?? true}
          onChange={(e) => onChange({ ...config, showInDocument: e.target.checked })}
          className="h-4 w-4 rounded"
        />
        แสดงรายชื่อไฟล์ในเอกสารพิมพ์ / PDF / อีเมล
      </label>

      <p className="text-xs text-slate-500">
        รองรับเฉพาะ PDF, JPG, JPEG และ PNG — ไฟล์จะถูกเก็บใน Google Drive แยกตามแผนกของผู้สร้าง
      </p>
    </div>
  );
}
