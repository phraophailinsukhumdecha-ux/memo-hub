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
import { Badge } from '@/components/ui/badge';
import { ListPagination } from '@/components/list-pagination';
import { useAuth } from '@/lib/auth-context';
import { useDashboardTitle } from '@/app/dashboard/layout';
import { subscribeToPendingMemos, approveMemo, rejectMemo } from '@/lib/memos';
import { subscribeToTemplates } from '@/lib/templates';
import { subscribeToUsers } from '@/lib/users';
import { Memo, MemoTemplate, User } from '@/types';
import { resolveTypography } from '@/lib/typography';
import { isUserNextApprover, hasUserActed, canUserActOnMemo } from '@/lib/approval-flow';
import { orderFieldsWithAttachmentsLast } from '@/lib/field-order';
import { getMemoDisplaySubject } from '@/lib/memo-subject';
import { formatDate, DateTimeCell } from '@/utils/cn';
import { SectionRenderer } from '@/components/memo-sections';
import { MemoRemarks } from '@/components/memo-remarks';

export default function ApprovalsPage() {
  const { user } = useAuth();
  const { setTitle } = useDashboardTitle();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [templates, setTemplates] = useState<MemoTemplate[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => { setTitle('รออนุมัติ'); }, [setTitle]);
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [detailHtml, setDetailHtml] = useState('');
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToPendingMemos((data) => {
      // One row per memo, regardless of how many columns the user occupies.
      setMemos(Array.from(new Map(data.map((memo) => [memo.id, memo])).values()));
    });

    const unsubTemplates = subscribeToTemplates(setTemplates);
    const unsubUsers = subscribeToUsers(setAllUsers);

    return () => {
      unsubscribe();
      unsubTemplates();
      unsubUsers();
    };
  }, [user]);

  // Show only memos where the current admin is selected as checker/approver
  // (appears in an approval-grid column other than col_0, which is the owner's slot)
  const myPendingMemos = memos.filter((m) => {
    if (!user) return false;
    const inGrid = Object.values(m.formData || {}).some((v) => {
      if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
      return Object.entries(v as Record<string, unknown>).some(([colKey, col]) => {
        if (!colKey.startsWith('col_') || colKey === 'col_0') return false;
        if (!col || typeof col !== 'object') return false;
        const c = col as { userId?: string; name?: string };
        return c.userId === user.id || (!!c.name && c.name === user.displayName);
      });
    });
    if (!inGrid) return false;
    // Sequential gating: open memos stay hidden until it is this user's turn.
    const isOpen = m.status === 'new' || m.status === 'waiting';
    if (isOpen && !isUserNextApprover(m, user) && !hasUserActed(m, user)) return false;
    return true;
  });

  const filteredMemos = myPendingMemos.filter((m) => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return true;
    return (
      m.memoNumber.toLowerCase().includes(needle) ||
      m.id.toLowerCase().includes(needle) ||
      m.title.toLowerCase().includes(needle) ||
      getMemoDisplaySubject(m).toLowerCase().includes(needle) ||
      m.ownerName.toLowerCase().includes(needle)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredMemos.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageMemos = filteredMemos.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleViewDetail = (memo: Memo) => {
    setSelectedMemo(memo);
    setIsDetailDialogOpen(true);
    setDetailHtml('');
    fetch(`/api/memo-id-html?id=${memo.id}`)
      .then((res) => res.text())
      .then(setDetailHtml)
      .catch(() => setDetailHtml(''));
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
      <div className="flex items-center justify-between max-sm:flex-col max-sm:items-stretch max-sm:gap-2">
        <div className="flex items-center space-x-2 max-sm:space-x-0">
          <Input
            placeholder="ค้นหา เลขที่/หัวข้อ/ผู้สร้าง..."
            className="w-64 max-sm:w-full"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-white max-sm:hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44 whitespace-nowrap">เลขที่ Memo</TableHead>
                <TableHead className="whitespace-nowrap">หัวข้อ</TableHead>
                <TableHead className="w-52 whitespace-nowrap hidden md:table-cell">ผู้สร้าง</TableHead>
                <TableHead className="w-44 whitespace-nowrap hidden md:table-cell">วันที่สร้าง</TableHead>
                <TableHead className="w-44 whitespace-nowrap hidden md:table-cell">Deadline</TableHead>
                <TableHead className="w-32 whitespace-nowrap">การดำเนินการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMemos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-600 py-8">
                    ไม่มี Memo ที่มอบหมายให้คุณตรวจสอบหรืออนุมัติ
                  </TableCell>
                </TableRow>
              ) : (
                pageMemos.map((memo) => {
                  const isOverdue = Boolean(memo.deadlineAt) && new Date(memo.deadlineAt) < new Date();
                  const canAct = canUserActOnMemo(memo, user);
                  return (
                  <TableRow key={memo.id}>
                    <TableCell className="font-mono text-sm whitespace-nowrap">{memo.id}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{getMemoDisplaySubject(memo)}</TableCell>
                    <TableCell className="whitespace-nowrap hidden md:table-cell">{memo.ownerName}</TableCell>
                    <TableCell className="whitespace-nowrap hidden md:table-cell"><DateTimeCell date={memo.createdAt} /></TableCell>
                    <TableCell className="whitespace-nowrap hidden md:table-cell"><DateTimeCell date={memo.deadlineAt} /></TableCell>
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
                        {isOverdue ? (
                          <Badge className="bg-orange-100 text-orange-700 border-orange-200">เลยเวลา</Badge>
                        ) : !canAct ? (
                          memo.status === 'new' || memo.status === 'waiting' ? (
                            <Badge
                              className="bg-slate-100 text-slate-600 border-slate-200"
                              title="ผู้สร้าง Memo ไม่สามารถอนุมัติ Memo ของตนเองได้"
                            >
                              รอผู้อื่นดำเนินการ
                            </Badge>
                          ) : null
                        ) : (
                          <>
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
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
      </div>

      {/* Mobile card list (table is hidden below sm) */}
      <div className="space-y-2 sm:hidden">
        {filteredMemos.length === 0 ? (
          <div className="rounded-lg border bg-white p-8 text-center text-slate-600">
            ไม่มี Memo ที่มอบหมายให้คุณตรวจสอบหรืออนุมัติ
          </div>
        ) : (
          pageMemos.map((memo) => {
            const isOverdue = Boolean(memo.deadlineAt) && new Date(memo.deadlineAt) < new Date();
            const canAct = canUserActOnMemo(memo, user);
            const isOpen = memo.status === 'new' || memo.status === 'waiting';
            return (
              <div key={memo.id} className="rounded-lg border bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => handleViewDetail(memo)}
                  >
                    <p className="font-mono text-xs text-slate-500">{memo.id}</p>
                    <p className="truncate text-sm font-medium text-slate-900">{getMemoDisplaySubject(memo)}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{memo.ownerName}</p>
                  </button>
                  {isOverdue ? (
                    <Badge className="shrink-0 bg-orange-100 text-orange-700 border-orange-200">เลยเวลา</Badge>
                  ) : null}
                </div>
                <div className="mt-1 flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleViewDetail(memo)} title="ดูรายละเอียด">
                    <Eye className="h-4 w-4" />
                  </Button>
                  {!isOverdue && canAct ? (
                    <>
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
                    </>
                  ) : isOpen && !isOverdue && !canAct ? (
                    <Badge
                      className="bg-slate-100 text-slate-600 border-slate-200"
                      title="ผู้สร้าง Memo ไม่สามารถอนุมัติ Memo ของตนเองได้"
                    >
                      รอผู้อื่นดำเนินการ
                    </Badge>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      <ListPagination
        page={safePage}
        totalPages={totalPages}
        totalItems={filteredMemos.length}
        onPageChange={setPage}
      />

      {/* View Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto max-sm:left-0 max-sm:top-0 max-sm:flex max-sm:h-dvh max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:flex-col max-sm:overflow-hidden max-sm:rounded-none max-sm:border-0">
          <DialogHeader className="max-sm:shrink-0">
            <DialogTitle className="max-sm:text-base max-sm:pr-6">{selectedMemo?.memoNumber || selectedMemo?.id} - {selectedMemo ? getMemoDisplaySubject(selectedMemo) : ''}</DialogTitle>
          </DialogHeader>
          <div className="max-sm:flex-1 max-sm:overflow-y-auto sm:contents">
          <div className="max-sm:hidden sm:contents">
          {selectedMemo && (() => {
            const detailTemplate = templates.find((t) => t.id === selectedMemo.templateId) || null;
            const detailOwnerUser = allUsers.find((u) => u.id === selectedMemo.ownerId) || null;
            if (!detailTemplate) return <p className="text-sm text-slate-500">ไม่พบเทมเพลต</p>;
            return (
              <>
              <div className="memo-font space-y-4">
                {orderFieldsWithAttachmentsLast(detailTemplate.fields.filter((f) => f.type !== 'memo_type')).map((field) => (
                  <SectionRenderer
                    key={field.id}
                    field={field}
                    value={selectedMemo.formData?.[field.id]}
                    formData={{ ...(selectedMemo.formData as Record<string, unknown>), memoNumber: selectedMemo.memoNumber }}
                    readonly={true}
                    ownerUser={detailOwnerUser}
                    users={allUsers}
                    typography={detailTemplate.typography}
                    memoId={selectedMemo.id}
                    viewerId={user?.id}
                    viewerRole={user?.role}
                  />
                ))}
              </div>
              <MemoRemarks memo={selectedMemo} />
              </>
            );
          })()}
          </div>
          <div
            className="hidden max-sm:block memo-mobile-fit"
            dangerouslySetInnerHTML={{ __html: detailHtml }}
          />
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
