import React from 'react';
import type { Memo } from '@/types';

/** Placeholder comments written by the email action flow are not real remarks. */
const AUTO_COMMENTS = new Set([
  'อนุมัติผ่านอีเมล',
  'ปฏิเสธผ่านอีเมล',
  'ดำเนินการผ่านอีเมล',
]);

interface MemoRemarksProps {
  memo: Memo;
  className?: string;
}

/**
 * Remarks left by approvers/rejecters. Rendered below the memo document on
 * every web view so the reader sees the same notes as the printed/PDF version.
 */
export function MemoRemarks({ memo, className = '' }: MemoRemarksProps) {
  const approvals = Array.isArray(memo.approvals) ? memo.approvals : [];

  const items: Array<{ action: 'approve' | 'reject'; name: string; comment: string; channel?: 'web' | 'email' }> = [];
  for (const approval of approvals) {
    const comment = (approval.comment || '').trim();
    if (!comment || AUTO_COMMENTS.has(comment)) continue;
    items.push({
      action: approval.action,
      name: approval.approverName || '-',
      comment,
      channel: approval.channel,
    });
  }

  const rejection = (memo.rejectionComment || '').trim();
  if (rejection && !AUTO_COMMENTS.has(rejection) && !items.some((item) => item.action === 'reject' && item.comment === rejection)) {
    const rejecter = approvals.find((approval) => approval.action === 'reject');
    items.push({
      action: 'reject',
      name: rejecter?.approverName || '-',
      comment: rejection,
      channel: rejecter?.channel,
    });
  }

  if (items.length === 0) return null;

  return (
    <div className={`rounded-lg border border-slate-300 bg-slate-50 p-3 ${className}`}>
      <p className="mb-1 text-sm font-semibold text-slate-900">หมายเหตุ</p>
      <ul className="space-y-1">
        {items.map((item, index) => (
          <li key={`${item.action}-${index}`} className="text-sm text-slate-700">
            <span className={item.action === 'approve' ? 'font-semibold text-green-700' : 'font-semibold text-red-600'}>
              {item.action === 'approve' ? 'อนุมัติโดย' : 'ปฏิเสธโดย'}:
            </span>{' '}
            {item.name}
            {item.channel === 'email' ? (
              <span className="text-slate-500"> (ผ่านอีเมล)</span>
            ) : item.channel === 'web' ? (
              <span className="text-slate-500"> (ผ่านระบบ)</span>
            ) : null}
            {' — '}
            {item.comment}
          </li>
        ))}
      </ul>
    </div>
  );
}
