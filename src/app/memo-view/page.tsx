'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Memo, MemoTemplate, User } from '@/types';
import { resolveTypography } from '@/lib/typography';
import { SectionRenderer } from '@/components/memo-sections';

function MemoViewContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [memo, setMemo] = useState<Memo | null>(null);
  const [template, setTemplate] = useState<MemoTemplate | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [owner, setOwner] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('ไม่พบ Token');
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/memo-view?token=${token}`);
        const data = await res.json();
        if (data.ok) {
          setMemo(data.memo);
          setTemplate(data.template);
          setUsers(data.users || []);
          setOwner(data.owner || null);
        } else {
          setError(data.error || 'ไม่พบข้อมูล');
        }
      } catch {
        setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-500">กำลังโหลด...</p>
      </div>
    );
  }

  if (error || !memo) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠</span>
          </div>
          <h1 className="text-xl font-bold text-red-600 mb-2">เปิด Memo ไม่ได้</h1>
          <p className="text-slate-600">{error}</p>
          <p className="text-xs text-slate-400 mt-4">MemoHub Digital Memo & Approval System</p>
        </div>
      </div>
    );
  }

  const statusBadge =
    memo.status === 'approved' ? (
      <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">อนุมัติแล้ว</span>
    ) : memo.status === 'rejected' ? (
      <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600">ถูกปฏิเสธ</span>
    ) : (
      <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">รออนุมัติ</span>
    );

  const visibleFields = (template?.fields || []).filter(
    (f) =>
      f.type !== 'memo_type' &&
      f.type !== 'section_title' &&
      f.type !== 'checkbox_group' &&
      !(f.type === 'dropdown_select' && f.label === 'จุดประสงค์')
  );

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-slate-900">{memo.memoNumber}</h1>
          {statusBadge}
        </div>
        <div className="memo-font bg-white border-2 border-slate-900 text-sm relative">
          <div className="p-4 space-y-0">
            {visibleFields.map((field) => (
              <SectionRenderer
                key={field.id}
                field={field}
                value={(memo.formData as Record<string, unknown>)?.[field.id]}
                formData={{
                  ...(memo.formData as Record<string, unknown>),
                  memoNumber: memo.memoNumber,
                }}
                readonly={true}
                ownerUser={owner}
                users={users}
                typography={template?.typography}
              />
            ))}
          </div>
          {memo.status === 'approved' && (
            <div className="absolute bottom-10 right-10 w-40 h-40 border-4 border-green-600 rounded-full flex flex-col items-center justify-center -rotate-12 opacity-80">
              <span className="text-green-600 font-extrabold tracking-wider text-sm">APPROVED</span>
              <span className="text-green-600 text-xs mt-0.5">อนุมัติแล้ว</span>
              <div className="w-4/5 h-px bg-green-600 my-1" />
              <span className="text-green-600 text-[10px]">MemoHub</span>
            </div>
          )}
          {memo.status === 'rejected' && (
            <div className="absolute bottom-10 right-10 w-40 h-40 border-4 border-red-600 rounded-full flex flex-col items-center justify-center -rotate-12 opacity-80">
              <span className="text-red-600 font-extrabold tracking-wider text-sm">REJECTED</span>
              <span className="text-red-600 text-xs mt-0.5">ถูกปฏิเสธ</span>
              <div className="w-4/5 h-px bg-red-600 my-1" />
              <span className="text-red-600 text-[10px]">MemoHub</span>
            </div>
          )}
        </div>
        {memo.status === 'rejected' && memo.approvals?.filter((a) => a.action === 'reject').length > 0 && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-semibold text-red-700 mb-1">หมายเหตุการไม่อนุมัติ</p>
            {memo.approvals.filter((a) => a.action === 'reject').map((a, i) => (
              <div key={i} className="text-sm text-red-600">
                <p><span className="font-medium">{a.approverName}</span>: {a.comment}</p>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-400 text-center mt-4">MemoHub Digital Memo & Approval System</p>
      </div>
    </div>
  );
}

export default function MemoViewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <p className="text-slate-500">กำลังโหลด...</p>
        </div>
      }
    >
      <MemoViewContent />
    </Suspense>
  );
}
