'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Memo, MemoTemplate, User } from '@/types';
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
        <div className="bg-white border-2 border-slate-900 text-sm">
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
        </div>
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
