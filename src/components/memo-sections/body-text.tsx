'use client';

import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { BodyTextConfig, MemoTypography } from '@/types';
import { resolveTypography } from '@/lib/typography';

interface BodyTextProps {
  config?: BodyTextConfig;
  value?: string;
  onChange?: (value: string) => void;
  readonly?: boolean;
  typography?: MemoTypography;
}

export function BodyText({ config, value = '', onChange, readonly, typography }: BodyTextProps) {
  const lines = config?.lines || 12;
  const placeholder = config?.placeholder || 'กรอกเนื้อหา...';
  const typo = resolveTypography(typography);

  if (readonly) {
    const bodyStyle: React.CSSProperties = {
      fontFamily: typo.fontFamily,
      fontSize: `${typo.baseFontSize}px`,
      lineHeight: typo.lineHeight,
      textAlign: typo.textAlign,
      fontWeight: typo.boldBody ? 700 : 400,
    };
    return (
      <div className="border border-slate-900 p-3 min-h-[200px]" style={{ fontFamily: typo.fontFamily }}>
        {value ? (
          <p className="text-slate-900 whitespace-pre-wrap" style={bodyStyle}>{value}</p>
        ) : (
          <div className="space-y-6">
            {Array.from({ length: lines }).map((_, i) => (
              <div key={i} className="border-b border-slate-300">&nbsp;</div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border border-slate-900 p-3">
      <Textarea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="min-h-[200px] border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 resize-none"
        style={{ minHeight: `${lines * 1.75}rem` }}
      />
    </div>
  );
}
