'use client';

import React from 'react';
import { CompanyHeaderConfig } from '@/types';

interface CompanyHeaderProps {
  config?: CompanyHeaderConfig;
  readonly?: boolean;
  memoNumber?: string;
  refNo?: string;
  quotationNo?: string;
  jobNo?: string;
  date?: string;
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

export function CompanyHeader({ config, readonly, memoNumber, refNo, quotationNo, jobNo, date }: CompanyHeaderProps) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  return (
    <div className="mb-4">
      {/* Logo + Company Name */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cfg.logoUrl}
            alt="Company Logo"
            className="h-14 w-auto object-contain"
          />
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-slate-600 tracking-wide">{cfg.companyName}</p>
        </div>
      </div>

      {/* MEMORANDUM Header + Memo Details */}
      <div className="border border-slate-900">
        <div className="flex">
          {/* Left: MEMORANDUM + Address */}
          <div className="flex-1 border-r border-slate-900 p-4">
            <h2 className="text-lg font-bold tracking-wider text-slate-900 mb-3">MEMORANDUM</h2>
            <div className="text-xs leading-relaxed text-slate-900 space-y-0.5">
              <p>{cfg.companyName}</p>
              {cfg.addressLines.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>

          {/* Right: Memo Details Table */}
          <div className="w-60 p-4">
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="font-bold text-slate-900 pr-1 py-1 whitespace-nowrap">MEMO NO.</td>
                  <td className="text-slate-900 py-1 whitespace-nowrap">: {memoNumber || '-'}</td>
                </tr>
                <tr>
                  <td className="font-bold text-slate-900 pr-1 py-1 whitespace-nowrap">REF. NO.</td>
                  <td className="text-slate-900 py-1 whitespace-nowrap">: {refNo || '(if any)'}</td>
                </tr>
                <tr>
                  <td className="font-bold text-slate-900 pr-1 py-1 whitespace-nowrap">Quotation no.</td>
                  <td className="text-slate-900 py-1 whitespace-nowrap">: {quotationNo || '-'}</td>
                </tr>
                <tr>
                  <td className="font-bold text-slate-900 pr-1 py-1 whitespace-nowrap">Job no.</td>
                  <td className="text-slate-900 py-1 whitespace-nowrap">: {jobNo || '-'}</td>
                </tr>
                <tr>
                  <td className="font-bold text-slate-900 pr-1 py-1 whitespace-nowrap">DATE</td>
                  <td className="text-slate-900 py-1 whitespace-nowrap">: {date || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
