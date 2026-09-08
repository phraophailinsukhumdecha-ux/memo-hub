'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface MemoData {
  memoNumber: string;
  title: string;
  ownerName: string;
  department: string;
  deadlineAt: string;
  status: string;
}

function EmailCancelContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [memo, setMemo] = useState<MemoData | null>(null);
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('ไม่พบ Token');
      setLoading(false);
      return;
    }

    const fetchMemo = async () => {
      try {
        const res = await fetch(`/api/email-action?token=${token}&action=info`);
        const data = await res.json();
        if (data.ok) {
          setMemo(data.memo);
        } else {
          setError(data.error || 'ไม่พบข้อมูล');
        }
      } catch {
        setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
      } finally {
        setLoading(false);
      }
    };

    fetchMemo();
  }, [token]);

  const handleSubmit = async () => {
    if (!remark.trim()) {
      setError('กรุณากรอกเหตุผลในการปฏิเสธ');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/email-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action: 'reject', remark: remark.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setSuccess(true);
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">กำลังโหลด...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✗</span>
          </div>
          <h1 className="text-xl font-bold text-red-600 mb-2">ปฏิเสธ Memo สำเร็จ</h1>
          <p className="text-slate-600 mb-2">Memo: {memo?.memoNumber}</p>
          <p className="text-slate-600 mb-4">ดำเนินการโดย: {memo?.ownerName}</p>
          <div className="bg-slate-50 rounded-lg p-3 text-left mb-4">
            <p className="text-xs text-slate-500 mb-1">เหตุผล:</p>
            <p className="text-sm text-slate-700">{remark}</p>
          </div>
          <p className="text-xs text-slate-400">MemoHub Digital Memo & Approval System</p>
        </div>
      </div>
    );
  }

  if (error && !memo) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠</span>
          </div>
          <h1 className="text-xl font-bold text-red-600 mb-2">เกิดข้อผิดพลาด</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-lg w-full">
        <h1 className="text-xl font-bold text-slate-900 mb-4">ปฏิเสธ Memo</h1>

        {memo && (
          <div className="mb-4 p-3 bg-slate-50 rounded-lg">
            <p className="text-sm"><strong>เลขที่:</strong> {memo.memoNumber}</p>
            <p className="text-sm"><strong>หัวข้อ:</strong> {memo.title}</p>
            <p className="text-sm"><strong>ผู้สร้าง:</strong> {memo.ownerName} ({memo.department || '-'})</p>
            <p className="text-sm"><strong>Deadline:</strong> {new Date(memo.deadlineAt).toLocaleDateString('th-TH')}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>เหตุผลในการปฏิเสธ *</Label>
            <Textarea
              rows={4}
              value={remark}
              onChange={(e) => { setRemark(e.target.value); setError(''); }}
              placeholder="กรอกเหตุผลว่าทำไมถึงไม่อนุมัติ Memo นี้..."
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => window.history.back()} disabled={submitting}>
              ยกเลิก
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={handleSubmit}
              disabled={!remark.trim() || submitting}
            >
              {submitting ? 'กำลังดำเนินการ...' : 'ยืนยันปฏิเสธ'}
            </Button>
          </div>
        </div>

        <p className="text-xs text-slate-400 text-center mt-6">MemoHub Digital Memo & Approval System</p>
      </div>
    </div>
  );
}

export default function EmailCancelPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-slate-500">กำลังโหลด...</p></div>}>
      <EmailCancelContent />
    </Suspense>
  );
}
