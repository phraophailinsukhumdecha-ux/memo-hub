'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { useDashboardTitle } from '@/app/dashboard/layout';
import { cancelMemo } from '@/lib/memos';
import { subscribeToFirestoreDoc } from '@/lib/firestore-db';
import { subscribeToTemplates } from '@/lib/templates';
import { subscribeToUsers } from '@/lib/users';
import { Memo, MemoTemplate, User } from '@/types';
import { formatDate, DateTimeCell, cn } from '@/utils/cn';
import { ArrowLeft, XCircle } from 'lucide-react';
import { SectionRenderer } from '@/components/memo-sections';

export default function MemoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { setTitle } = useDashboardTitle();
  const [memo, setMemo] = useState<Memo | null>(null);
  const [template, setTemplate] = useState<MemoTemplate | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const memoId = params.id as string;

  useEffect(() => { setTitle('รายละเอียด Memo'); }, [setTitle]);

  useEffect(() => {
    if (!memoId) return;

    const unsubscribe = subscribeToFirestoreDoc<Memo>('memos', memoId, (data) => {
      setMemo(data);
    });

    const unsubUsers = subscribeToUsers((data) => setAllUsers(data));

    return () => { unsubscribe(); unsubUsers(); };
  }, [memoId]);

  useEffect(() => {
    if (!memo?.templateId) return;

    const unsubscribe = subscribeToTemplates((templates) => {
      const found = templates.find((t) => t.id === memo.templateId);
      setTemplate(found || null);
    });

    return () => unsubscribe();
  }, [memo?.templateId]);

  const handleCancel = async () => {
    if (!memo) return;
    if (confirm('คุณต้องการยกเลิก Memo นี้ใช่หรือไม่?')) {
      await cancelMemo(memo.id);
      router.push('/dashboard/memos');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new': return <Badge variant="new">ใหม่</Badge>;
      case 'waiting': return <Badge variant="waiting">รออนุมัติ</Badge>;
      case 'approved': return <Badge variant="approved">อนุมัติแล้ว</Badge>;
      case 'rejected': return <Badge variant="rejected">ปฏิเสธ</Badge>;
      case 'cancel': return <Badge variant="cancel">ยกเลิก</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          กลับ
        </Button>
        {memo && (memo.status === 'new' || memo.status === 'waiting') && memo.ownerId === user?.id && (
          <Button variant="destructive" onClick={handleCancel}>
            <XCircle className="mr-2 h-4 w-4" />
            ยกเลิก Memo
          </Button>
        )}
      </div>

      {!memo ? (
        <div className="text-center py-8 text-slate-600">ไม่พบ Memo</div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{memo.title}</CardTitle>
                {getStatusBadge(memo.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>เลขที่ Memo</Label><p className="font-mono">{memo.id}</p></div>
                <div><Label>เทมเพลต</Label><p>{memo.templateName}</p></div>
                <div><Label>ผู้สร้าง</Label><p>{memo.ownerName}</p></div>
                <div><Label>แผนก</Label><p>{memo.department || '-'}</p></div>
                <div><Label>วันที่สร้าง</Label><p><DateTimeCell date={memo.createdAt} /></p></div>
                <div><Label>Deadline</Label><p><DateTimeCell date={memo.deadlineAt} /></p></div>
                <div><Label>ระดับปัจจุบัน</Label><p>{memo.currentApprovalLevel || '-'}</p></div>
              </div>
            </CardContent>
          </Card>

          {template && memo.formData && (
            <Card>
              <CardHeader>
                <CardTitle>ข้อมูลในเทมเพลต</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(() => {
                  const memoTypeField = template.fields.find((f) => f.type === 'memo_type');
                  const currentMemoType = memoTypeField ? ((memo.formData as Record<string, unknown>)[memoTypeField.id] as string) : undefined;
                  const ownerUserData = allUsers.find((u) => u.id === memo.ownerId) || null;
                  return template.fields.map((field) => (
                    <div key={field.id}>
                      <SectionRenderer
                        field={field}
                        value={(memo.formData as Record<string, unknown>)[field.id]}
                        readonly={true}
                        memoType={currentMemoType}
                        ownerUser={ownerUserData}
                        users={allUsers}
                        groups={[]}
                      />
                    </div>
                  ));
                })()}
              </CardContent>
            </Card>
          )}

          {!template && memo.formData && (
            <Card>
              <CardHeader>
                <CardTitle>รายละเอียด</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border p-3 bg-slate-50">
                  {Object.entries(memo.formData as Record<string, unknown>).map(([key, value]) => (
                    <div key={key} className="py-1">
                      <span className="font-medium text-sm">{key}: </span>
                      <span className="text-sm">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {memo.approvals && memo.approvals.length > 0 && (
            <Card>
              <CardHeader><CardTitle>ประวัติการอนุมัติ</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {memo.approvals.map((h, i) => (
                    <div key={i} className={cn('rounded-lg border p-3', h.action === 'approve' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50')}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{h.approverName}</p>
                          <p className="text-sm text-slate-700">ระดับ {h.level} - {h.action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'}</p>
                        </div>
                        <p className="text-xs text-slate-500"><DateTimeCell date={h.actedAt} /></p>
                      </div>
                      {h.comment && <p className="mt-2 text-sm text-slate-600">{h.comment}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
