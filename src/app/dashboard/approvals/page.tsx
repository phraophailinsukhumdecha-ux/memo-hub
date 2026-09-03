'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle, XCircle, Eye } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useDashboardTitle } from '@/app/dashboard/layout';
import { subscribeToPendingMemos, approveMemo, rejectMemo } from '@/lib/memos';
import { Memo } from '@/types';
import { formatDate, DateTimeCell } from '@/utils/cn';

export default function ApprovalsPage() {
  const { user } = useAuth();
  const { setTitle } = useDashboardTitle();
  const [memos, setMemos] = useState<Memo[]>([]);

  useEffect(() => { setTitle('รออนุมัติ'); }, [setTitle]);
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToPendingMemos((data) => {
      setMemos(data);
    });

    return () => unsubscribe();
  }, [user]);

  const handleViewDetail = (memo: Memo) => {
    setSelectedMemo(memo);
    setIsDetailDialogOpen(true);
  };

  const handleApprove = (memo: Memo) => {
    setSelectedMemo(memo);
    setIsApproveDialogOpen(true);
  };

  const handleReject = (memo: Memo) => {
    setSelectedMemo(memo);
    setIsRejectDialogOpen(true);
  };

  const confirmApprove = async () => {
    if (!selectedMemo || !user) return;

    setProcessing(true);
    try {
      await approveMemo(selectedMemo.id, user.id, user.displayName, comment || undefined);
      setIsApproveDialogOpen(false);
      setComment('');
      setSelectedMemo(null);
    } catch (error) {
      console.error('Error approving memo:', error);
    } finally {
      setProcessing(false);
    }
  };

  const confirmReject = async () => {
    if (!selectedMemo || !user || !comment) return;

    setProcessing(true);
    try {
      await rejectMemo(selectedMemo.id, user.id, user.displayName, comment);
      setIsRejectDialogOpen(false);
      setComment('');
      setSelectedMemo(null);
    } catch (error) {
      console.error('Error rejecting memo:', error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Input placeholder="ค้นหา Memo..." className="w-64" />
        </div>
      </div>

      <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">เลขที่ Memo</TableHead>
                <TableHead>หัวข้อ</TableHead>
                <TableHead className="w-32">เทมเพลต</TableHead>
                <TableHead className="w-32">ผู้สร้าง</TableHead>
                <TableHead className="w-36">วันที่สร้าง</TableHead>
                <TableHead className="w-36">Deadline</TableHead>
                <TableHead className="w-32">การดำเนินการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-600 py-8">
                    ไม่มี Memo ที่รอการอนุมัติ
                  </TableCell>
                </TableRow>
              ) : (
                memos.map((memo) => (
                  <TableRow key={memo.id}>
                    <TableCell className="font-mono text-sm">{memo.id}</TableCell>
                    <TableCell className="font-medium">{memo.title}</TableCell>
                    <TableCell>{memo.templateName}</TableCell>
                    <TableCell>{memo.ownerName}</TableCell>
                    <TableCell><DateTimeCell date={memo.createdAt} /></TableCell>
                    <TableCell><DateTimeCell date={memo.deadlineAt} /></TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetail(memo)}
                          title="ดูรายละเอียด"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-green-600 hover:text-green-700"
                          onClick={() => handleApprove(memo)}
                          title="อนุมัติ"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleReject(memo)}
                          title="ปฏิเสธ"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
      </div>

      {/* View Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>รายละเอียด Memo</DialogTitle>
            <DialogDescription>เลขที่ {selectedMemo?.id}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>หัวข้อ</Label><p className="text-sm">{selectedMemo?.title}</p></div>
            <div><Label>เทมเพลต</Label><p className="text-sm">{selectedMemo?.templateName}</p></div>
            <div><Label>ผู้สร้าง</Label><p className="text-sm">{selectedMemo?.ownerName}</p></div>
            <div><Label>วันที่สร้าง</Label><p className="text-sm">{selectedMemo && `${formatDate(selectedMemo.createdAt)} ${selectedMemo.createdAt.getFullYear() + 543}`}</p></div>
            <div><Label>Deadline</Label><p className="text-sm">{selectedMemo && `${formatDate(selectedMemo.deadlineAt)} ${selectedMemo.deadlineAt.getFullYear() + 543}`}</p></div>
            {selectedMemo?.approvals && selectedMemo.approvals.length > 0 && (
              <div>
                <Label>ประวัติการอนุมัติ</Label>
                <div className="mt-2 space-y-2">
                  {selectedMemo.approvals.map((h, i) => (
                    <div key={i} className="rounded border p-2 text-sm">
                      <p><strong>{h.approverName}</strong> - {h.action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'}</p>
                      {h.comment && <p className="text-slate-600">{h.comment}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>ปิด</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>อนุมัติ Memo</DialogTitle>
            <DialogDescription>คุณต้องการอนุมัติ Memo {selectedMemo?.id} ใช่หรือไม่?</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>ความเห็น (ไม่บังคับ)</Label>
              <Textarea
                placeholder="กรอกความเห็นประกอบการอนุมัติ"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={confirmApprove} disabled={processing}>
              {processing ? 'กำลังดำเนินการ...' : 'อนุมัติ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>ปฏิเสธ Memo</DialogTitle>
            <DialogDescription>คุณต้องการปฏิเสธ Memo {selectedMemo?.id} ใช่หรือไม่?</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>เหตุผลในการปฏิเสธ *</Label>
              <Textarea
                placeholder="กรอกเหตุผลในการปฏิเสธ"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={confirmReject} disabled={!comment || processing}>
              {processing ? 'กำลังดำเนินการ...' : 'ปฏิเสธ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
