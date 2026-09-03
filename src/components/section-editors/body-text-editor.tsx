'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BodyTextConfig } from '@/types';

interface BodyTextEditorProps {
  config: BodyTextConfig;
  onChange: (config: BodyTextConfig) => void;
}

export function BodyTextEditor({ config, onChange }: BodyTextEditorProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">จำนวนบรรทัด</Label>
        <Input
          type="number"
          value={config.lines || 12}
          onChange={(e) => onChange({ ...config, lines: parseInt(e.target.value) || 12 })}
          min={1}
          max={50}
          className="h-8"
        />
      </div>
      <div>
        <Label className="text-xs">Default Value (ถ้ามี)</Label>
        <Textarea
          value={config.defaultValue || ''}
          onChange={(e) => onChange({ ...config, defaultValue: e.target.value })}
          placeholder="ข้อความเริ่มต้น..."
          className="min-h-[80px]"
        />
      </div>
      <div>
        <Label className="text-xs">Placeholder</Label>
        <Input
          value={config.placeholder || ''}
          onChange={(e) => onChange({ ...config, placeholder: e.target.value })}
          placeholder="ข้อความตัวอย่าง"
          className="h-8"
        />
      </div>
    </div>
  );
}
