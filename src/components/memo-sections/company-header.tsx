'use client';

import React from 'react';
import { CompanyHeaderConfig } from '@/types';

interface CompanyHeaderProps {
  config?: CompanyHeaderConfig;
  readonly?: boolean;
}

const DEFAULT_CONFIG: CompanyHeaderConfig = {
  logoUrl: '/logo-df.png',
  companyName: 'บริษัท ดิจิทัล แฟคตอรี่ จำกัด (สำนักงานใหญ่)',
  addressLines: [
    'อาคารโอลิมเปียไทยทาวเวอร์ ชั้น 4 เลขที่ 444',
    'ถนนรัชดาภิเษก แขวงสามเสนนอก',
    'เขตห้วยขวาง กรุงเทพมหานคร 10310',
  ],
};

export function CompanyHeader({ config, readonly }: CompanyHeaderProps) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  return (
    <div className="border border-slate-900 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cfg.logoUrl}
            alt="Company Logo"
            className="h-16 w-auto object-contain"
          />
        </div>
        <div className="text-right text-sm leading-relaxed text-slate-900">
          <p className="font-semibold">{cfg.companyName}</p>
          {cfg.addressLines.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
