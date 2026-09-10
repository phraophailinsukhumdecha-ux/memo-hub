'use client';

import React from 'react';
import { CompanyHeaderConfig, MemoTypography } from '@/types';
import { resolveLogoSrc } from '@/lib/logo';
import { resolveTypography } from '@/lib/typography';

interface CompanyHeaderProps {
  config?: CompanyHeaderConfig;
  readonly?: boolean;
  memoNumber?: string;
  refNo?: string;
  quotationNo?: string;
  jobNo?: string;
  date?: string;
  typography?: MemoTypography;
}

export const DEFAULT_COMPANY_HEADER: CompanyHeaderConfig = {
  logoUrl: 'https://workflow.digitalfactory.co.th/logo/df_full_logo-01.png',
  companyName: 'Digital Factory Company Limited',
  companyNameTh: 'บริษัท ดิจิทัล แฟคตอรี่ จำกัด (สำนักงานใหญ่)',
  memorandumTitle: 'MEMORANDUM',
  addressLines: [
    'อาคารโอลิมเปียไทยทาวเวอร์ ชั้น 4 เลขที่ 444',
    'ถนนรัชดาภิเษก แขวงสามเสนนอก',
    'เขตห้วยขวาง กรุงเทพมหานคร 10310',
  ],
  memoNoLabel: 'MEMO NO.',
  refNoLabel: 'REF. NO. (if any)',
  quotationLabel: 'Quotation no.',
  jobNoLabel: 'Job no.',
  dateLabel: 'DATE',
};

export function CompanyHeader({ config, readonly, memoNumber, refNo, quotationNo, jobNo, date, typography }: CompanyHeaderProps) {
  const cfg = { ...DEFAULT_COMPANY_HEADER, ...config };
  const typo = resolveTypography(typography);

  return (
    <div className="mb-4" style={{ fontFamily: typo.fontFamily }}>
      {/* Logo + Company Name */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveLogoSrc(cfg.logoUrl)}
            alt="Company Logo"
            className="h-14 w-auto object-contain"
          />
        </div>
        <div className="text-right">
          <p className="text-3xl font-semibold text-slate-600 tracking-wide">{cfg.companyName}</p>
        </div>
      </div>

      {/* MEMORANDUM Header + Memo Details */}
      <div className="border border-slate-900">
        <div className="flex">
          {/* Left: MEMORANDUM + Address */}
          <div className="border-r border-slate-900 py-4 px-3 w-[55%] flex flex-col justify-center">
            {cfg.memorandumTitle ? (
              <h2 className="text-lg font-bold tracking-wider text-slate-900 mb-3 text-center">{cfg.memorandumTitle}</h2>
            ) : null}
            <div
              className="text-slate-900 space-y-0.5"
              style={{ fontSize: `${typo.baseFontSize}px`, lineHeight: typo.lineHeight }}
            >
              <p className="font-semibold">{cfg.companyNameTh}</p>
              {(cfg.addressLines || []).map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>

          {/* Right: Memo Details Table */}
          <div className="flex-1 p-4">
            <table
              className="w-full"
              style={{ fontSize: `${Math.round(typo.baseFontSize * 0.82)}px`, lineHeight: typo.lineHeight }}
            >
              <tbody>
                <tr>
                  <td className="font-bold text-slate-900 pr-1 py-1 whitespace-nowrap">{cfg.memoNoLabel}</td>
                  <td className="text-slate-900 py-1">: {memoNumber || '-'}</td>
                </tr>
                <tr>
                  <td className="font-bold text-slate-900 pr-1 py-1 whitespace-nowrap">{cfg.refNoLabel}</td>
                  <td className="text-slate-900 py-1">: {refNo || '-'}</td>
                </tr>
                <tr>
                  <td className="font-bold text-slate-900 pr-1 py-1 whitespace-nowrap">{cfg.quotationLabel}</td>
                  <td className="text-slate-900 py-1">: {quotationNo || '-'}</td>
                </tr>
                <tr>
                  <td className="font-bold text-slate-900 pr-1 py-1 whitespace-nowrap">{cfg.jobNoLabel}</td>
                  <td className="text-slate-900 py-1">: {jobNo || '-'}</td>
                </tr>
                <tr>
                  <td className="font-bold text-slate-900 pr-1 py-1 whitespace-nowrap">{cfg.dateLabel}</td>
                  <td className="text-slate-900 py-1">: {date || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
