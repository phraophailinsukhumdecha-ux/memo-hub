'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Download, Printer, Trash2, CheckCircle, Clock, FileText, LogOut, Mail, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { subscribeToMemos, approveMemo, cancelMemo, createMemo, deleteMemos } from '@/lib/memos';
import { subscribeToTemplates } from '@/lib/templates';
import { subscribeToUsers } from '@/lib/users';
import { downloadMemoPdf, printMemo } from '@/lib/memo-pdf';
import { Memo, MemoTemplate, User } from '@/types';
import { resolveTypography } from '@/lib/typography';
import { SectionRenderer } from '@/components/memo-sections';
import { MemoDocumentForm } from '@/components/memo-document-form';

export default function HomePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [templates, setTemplates] = useState<MemoTemplate[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [selectedMemos, setSelectedMemos] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [isCreating, setIsCreating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MemoTemplate | null>(null);
  const [sectionFormData, setSectionFormData] = useState<Record<string, unknown>>({});
  const [creating, setCreating] = useState(false);
  const [mounted, setMounted] = useState(false);

  const initFormData = (t: MemoTemplate) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
    const gridConfig = t.fields.find((f) => f.type === 'approval_grid');
    const gridFieldCfg = (gridConfig?.fieldConfig || {}) as { columns?: { title: string }[] };
    const cols = gridFieldCfg.columns || [];
    const gridValue: Record<string, { name?: string; userId?: string; signerTitle?: string; date?: string; time?: string }> = {};
    cols.forEach((col, i) => {
      if (i === 0) {
        gridValue[`col_${i}`] = { date: todayStr, time: timeStr, name: user?.displayName || '', userId: user?.id || '', signerTitle: user?.department || '' };
      } else if (i === cols.length - 1) {
        gridValue[`col_${i}`] = { date: todayStr, time: timeStr, name: '', signerTitle: '' };
      } else {
        gridValue[`col_${i}`] = { date: todayStr, time: timeStr, name: '', signerTitle: '' };
      }
    });
    const formData: Record<string, unknown> = {};
    for (const field of t.fields) {
      if (field.type === 'section_title' || field.type === 'company_header') continue;
      if (field.type === 'approval_grid') {
        formData[field.id] = gridValue;
      } else if (field.type === 'form_row') {
        const rowFieldConfig = (field.fieldConfig || {}) as { fields?: { name: string }[] };
        const rowFields = rowFieldConfig.fields || [];
        const rowValue: Record<string, string> = {};
        rowFields.forEach((rf) => { rowValue[rf.name] = ''; });
        formData[field.id] = rowValue;
      } else if (field.type === 'checkbox_group') {
        formData[field.id] = [];
      } else {
        formData[field.id] = '';
      }
    }
    return formData;
  };

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (user && user.isApprover !== true && user.role !== 'admin') {
      setActiveTab('mine');
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToMemos((data) => setMemos(data));
    return () => unsub();
  }, [user]);

  useEffect(() => {
    const unsub = subscribeToTemplates((data) => setTemplates(data));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribeToUsers((data) => setAllUsers(data));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
    }
  }, [user, router]);

  useEffect(() => {
    if (!user || memos.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const memoId = params.get('memo');
    const action = params.get('action');
    if (memoId) {
      const memo = memos.find((m) => m.id === memoId || m.memoNumber === memoId);
      if (memo) {
        setSelectedMemo(memo);
        setIsDetailOpen(true);
        if (action === 'approve' && (memo.status === 'waiting' || memo.status === 'new') && isApprover && !hasUserSigned(memo, user.id)) {
          setTimeout(() => handleApprove(memo.id), 500);
        }
        window.history.replaceState({}, '', '/home');
      }
    }
  }, [user, memos]);

  const detailTemplate = useMemo((): MemoTemplate | null => {
    if (!selectedMemo?.templateId) return null;
    return templates.find((t) => t.id === selectedMemo.templateId) || null;
  }, [selectedMemo, templates]);

  const detailOwnerUser = useMemo(() => {
    if (!selectedMemo?.ownerId) return null;
    return allUsers.find((u) => u.id === selectedMemo.ownerId) || null;
  }, [selectedMemo, allUsers]);

  const isApprover = user?.isApprover === true;

  const hasUserSigned = (memo: Memo, userId: string) => {
    const grid = memo.formData?.approval_grid_1 as Record<string, { name?: string; userId?: string; signed?: boolean }> | undefined;
    if (!grid) return false;
    for (const colKey of Object.keys(grid)) {
      if (colKey.startsWith('col_') && colKey !== 'col_0') {
        if ((grid[colKey]?.userId === userId || grid[colKey]?.name === user?.displayName) && grid[colKey]?.signed) return true;
      }
    }
    return false;
  };
  const isAdmin = user?.role === 'admin';

  const pendingMemos = useMemo(() => {
    if (!user) return [];
    return memos.filter((m) => {
      const grid = m.formData?.approval_grid_1 as Record<string, { name?: string }> | undefined;
      if (!grid) return false;
      return Object.values(grid).some((col) => col.name === user.displayName);
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [memos, user]);

  const myMemos = useMemo(() => {
    if (!user) return [];
    return memos.filter((m) => m.ownerId === user.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [memos, user]);

  if (!mounted || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">กำลังโหลด...</p>
      </div>
    );
  }

  const pendingCount = pendingMemos.filter((m) => m.status === 'waiting' || m.status === 'new').length;
  const approvedCount = pendingMemos.filter((m) => m.status === 'approved').length;
  const overdueCount = pendingMemos.filter((m) => {
    if (m.status !== 'waiting' && m.status !== 'new') return false;
    return new Date(m.deadlineAt) < new Date();
  }).length;
  const myCount = myMemos.length;

  const getApprovalProgress = (memo: Memo) => {
    const grid = memo.formData?.approval_grid_1 as Record<string, { name?: string; userId?: string; signed?: boolean }> | undefined;
    if (!grid) return { signed: 0, total: 0 };
    let signed = 0;
    let total = 0;
    for (const colKey of Object.keys(grid)) {
      if (colKey.startsWith('col_') && colKey !== 'col_0' && (grid[colKey]?.userId || grid[colKey]?.name)) {
        total++;
        if (grid[colKey]?.signed) signed++;
      }
    }
    return { signed, total };
  };

  const getStatusBadge = (memo: Memo) => {
    if (memo.status === 'approved') return <Badge className="bg-green-100 text-green-700 border-green-200">อนุมัติแล้ว (approve)</Badge>;
    if (memo.status === 'rejected') return <Badge className="bg-red-100 text-red-700 border-red-200">ถูกปฏิเสธ</Badge>;
    if (memo.status === 'cancel') return <Badge className="bg-slate-100 text-slate-700 border-slate-200">ยกเลิก</Badge>;
    if (new Date(memo.deadlineAt) < new Date()) return <Badge className="bg-orange-100 text-orange-700 border-orange-200">เลยเวลา</Badge>;
    const { signed, total } = getApprovalProgress(memo);
    const isOwner = memo.ownerId === user?.id;
    if (isOwner) {
      if (total > 0) return <Badge className="bg-blue-100 text-blue-700 border-blue-200">รออนุมัติ ({signed}/{total})</Badge>;
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200">รออนุมัติ</Badge>;
    }
    if (hasUserSigned(memo, user?.id || '')) {
      return <Badge className="bg-green-100 text-green-700 border-green-200">อนุมัติแล้ว</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-700 border-blue-200">รออนุมัติ</Badge>;
  };

  const handleApprove = async (memoId: string) => {
    if (!user) return;
    setApprovingId(memoId);
    try {
      await approveMemo(memoId, user.id, user.displayName);
    } catch (e) {
      console.error(e);
    } finally {
      setApprovingId(null);
    }
  };

  const handleDelete = async (memoId: string) => {
    if (!confirm('คุณต้องการลบ memo นี้ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้')) return;
    try {
      const { deleteMemo } = await import('@/lib/memos');
      await deleteMemo(memoId);
    } catch (e) {
      console.error(e);
      alert('ลบไม่สำเร็จ');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMemos.size === 0) return;
    if (!confirm(`คุณต้องการลบ ${selectedMemos.size} memo ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้`)) return;
    setDeleting(true);
    try {
      await deleteMemos(Array.from(selectedMemos));
      setSelectedMemos(new Set());
      setIsSelectMode(false);
    } catch (e) {
      console.error(e);
      alert('ลบไม่สำเร็จ');
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelectMemo = (memoId: string) => {
    setSelectedMemos((prev) => {
      const next = new Set(prev);
      if (next.has(memoId)) {
        next.delete(memoId);
      } else {
        next.add(memoId);
      }
      return next;
    });
  };

  const toggleSelectAll = (items: Memo[]) => {
    if (selectedMemos.size === items.length) {
      setSelectedMemos(new Set());
    } else {
      setSelectedMemos(new Set(items.map((m) => m.id)));
    }
  };

  const handleDownload = async (memo: Memo) => {
    const memoTemplate = templates.find((t) => t.id === memo.templateId) || null;
    const memoOwner = allUsers.find((u) => u.id === memo.ownerId) || null;
    setDownloadingId(memo.id);
    try {
      await downloadMemoPdf(memo, memoTemplate, [], memoOwner, allUsers);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePrint = (memo: Memo) => {
    const memoTemplate = templates.find((t) => t.id === memo.templateId) || null;
    const memoOwner = allUsers.find((u) => u.id === memo.ownerId) || null;
    printMemo(memo, memoTemplate, [], memoOwner, allUsers);
  };

  const handleSendEmail = async (memo: Memo) => {
    const grid = memo.formData?.approval_grid_1 as Record<string, { name?: string; userId?: string; email?: string }> | undefined;
    if (!grid) return alert('ไม่พบข้อมูลผู้อนุมัติ');

    const ownerEmail = allUsers.find((u) => u.id === memo.ownerId)?.email || '';
    const toEmails: string[] = [];
    for (const colKey of Object.keys(grid)) {
      if (colKey.startsWith('col_') && colKey !== 'col_0') {
        const col = grid[colKey];
        if (col?.userId) {
          const approver = allUsers.find((u) => u.id === col.userId);
          if (approver?.email && approver.email !== ownerEmail) {
            toEmails.push(approver.email);
          }
        }
      }
    }

    if (toEmails.length === 0) return alert('ไม่พบอีเมลผู้อนุมัติ (อีเมลซ้ำกับผู้สร้าง memo)');

    try {
      const res = await fetch('/api/send-memo-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memoId: memo.id, toEmails }),
      });
      const data = await res.json();
      if (data.ok) {
        alert(data.message || 'ส่งอีเมลสำเร็จ!');
      } else {
        alert(`${data.code ? `[${data.code}] ` : ''}${data.message || 'ส่งอีเมลไม่สำเร็จ'}`);
      }
    } catch {
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  const openDetail = (memo: Memo) => {
    setSelectedMemo(memo);
    setIsDetailOpen(true);
  };

  const formatDateStr = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTimeStr = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  };

  const handleCreateMemo = async (sendEmail = false) => {
    if (!selectedTemplate || !user) return;

    // Validate required fields in form_row
    const formRowField = selectedTemplate.fields.find((f) => f.type === 'form_row');
    if (formRowField) {
      const config = (formRowField.fieldConfig || {}) as { fields?: Array<{ name: string; label: string; required?: boolean }> };
      const fields = config.fields || [];
      const value = (sectionFormData[formRowField.id] as Record<string, string>) || {};
      for (const f of fields) {
        if (f.required && !value[f.name]) {
          alert(`กรุณากรอก "${f.label}" (จำเป็น)`);
          return;
        }
      }
    }

    // Validate CLIENT SPECIFIC / VENDOR SPECIFIC: at least one required (both allowed)
    const clientVal = (sectionFormData.form_row_1 as Record<string, string>)?.clientSpecific || '';
    const vendorVal = (sectionFormData.form_row_1 as Record<string, string>)?.vendorSpecific || '';
    if (!clientVal && !vendorVal) {
      alert('กรุณาเลือก CLIENT SPECIFIC หรือ VENDOR SPECIFIC อย่างน้อย 1 อัน');
      return;
    }

    setCreating(true);
    try {
      const formData = { ...sectionFormData };

      const memoId = await createMemo(selectedTemplate.id, selectedTemplate.name, formData, user.id, user.displayName, user.department);
      setIsCreating(false);
      setSelectedTemplate(null);
      setSectionFormData({});

      if (sendEmail && memoId) {
        const grid = formData.approval_grid_1 as Record<string, { userId?: string }> | undefined;
        if (grid) {
          const toEmails: string[] = [];
          for (const colKey of Object.keys(grid)) {
            if (colKey.startsWith('col_') && colKey !== 'col_0' && grid[colKey]?.userId) {
              const approver = allUsers.find((u) => u.id === grid[colKey]!.userId);
              if (approver?.email) toEmails.push(approver.email);
            }
          }
          if (toEmails.length > 0) {
            try {
              const res = await fetch('/api/send-memo-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ memoId, toEmails }),
              });
              const data = await res.json();
              console.log('Email send result:', data);
              if (data.ok) {
                alert('สร้าง Memo และส่งอีเมลสำเร็จ!');
              } else {
                alert('สร้าง Memo สำเร็จ แต่ส่งอีเมลไม่สำเร็จ: ' + (data.message || data.error || ''));
              }
            } catch {
              alert('สร้าง Memo สำเร็จ แต่ไม่สามารถส่งอีเมลได้');
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาด: ' + (e instanceof Error ? e.message : 'ไม่ทราบสาเหตุ'));
    } finally {
      setCreating(false);
    }
  };

  const renderMemoList = (items: Memo[], showApprove: boolean) => (
    <div className="space-y-3">
      {items.length === 0 && (
        <div className="text-center py-12 text-slate-600">
          <FileText className="mx-auto h-10 w-10 mb-3 opacity-50" />
          <p className="text-sm">ไม่มีรายการ</p>
        </div>
      )}
      {isSelectMode && items.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={selectedMemos.size === items.length}
            onChange={() => toggleSelectAll(items)}
            className="h-4 w-4 rounded"
          />
          <span className="text-slate-600">เลือกทั้งหมด ({selectedMemos.size}/{items.length})</span>
          {selectedMemos.size > 0 && (
            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 ml-auto" onClick={handleBulkDelete} disabled={deleting}>
              <Trash2 className="h-4 w-4 mr-1" />
              {deleting ? 'กำลังลบ...' : `ลบ ${selectedMemos.size} รายการ`}
            </Button>
          )}
        </div>
      )}
      {items.map((memo) => (
        <div key={memo.id} className="flex items-center justify-between border rounded-lg px-4 py-3 hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {isSelectMode && (
              <input
                type="checkbox"
                checked={selectedMemos.has(memo.id)}
                onChange={() => toggleSelectMemo(memo.id)}
                className="h-4 w-4 rounded shrink-0"
              />
            )}
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openDetail(memo)}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{memo.memoNumber}</span>
                <span className="text-sm text-slate-600 truncate">{memo.title}</span>
                {getStatusBadge(memo)}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-600">
                <span>{memo.ownerName}</span>
                <span>{formatDateStr(memo.createdAt)} {formatTimeStr(memo.createdAt)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-3 shrink-0">
            {showApprove && (memo.status === 'waiting' || memo.status === 'new') && !hasUserSigned(memo, user.id) && new Date(memo.deadlineAt) >= new Date() && (
              <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleApprove(memo.id)} disabled={approvingId === memo.id}>
                <CheckCircle className="h-4 w-4 mr-1" />
                อนุมัติ
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(memo)} disabled={downloadingId === memo.id}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleSendEmail(memo)} title="ส่งอีเมล">
              <Mail className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePrint(memo)}>
              <Printer className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(memo.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">M</div>
          <div>
            <h1 className="font-bold text-lg text-slate-900">MemoHub</h1>
            <p className="text-xs text-slate-600">{user?.displayName} ({user?.department || '-'})</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isSelectMode ? 'default' : 'outline'}
            size="sm"
            className={isSelectMode ? 'bg-slate-900 text-white' : 'text-slate-700'}
            onClick={() => { setIsSelectMode(!isSelectMode); setSelectedMemos(new Set()); }}
          >
            {isSelectMode ? 'ยกเลิกเลือก' : 'เลือก'}
          </Button>
          {isAdmin && (
            <Button variant="outline" size="sm" className="text-slate-700" onClick={() => router.push('/dashboard')}>
              <FileText className="h-4 w-4 mr-1" />
              Admin
            </Button>
          )}
          <Button variant="outline" size="sm" className="text-slate-700" onClick={() => { logout(); router.push('/auth/login'); }}>
            <LogOut className="h-4 w-4 mr-1" />
            ออกจากระบบ
          </Button>
        </div>
      </div>

      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            {isApprover && (
              <TabsTrigger value="pending" className="gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                รออนุมัติ
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1 text-xs">{pendingCount}</Badge>
              </TabsTrigger>
            )}
            <TabsTrigger value="mine" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Memo ของฉัน
              <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1 text-xs">{myCount}</Badge>
            </TabsTrigger>
          </TabsList>

          {isApprover && (
            <TabsContent value="pending">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base">รายการรออนุมัติ</CardTitle>
                  <div className="flex gap-2 text-xs">
                    <span className="text-blue-600">รออนุมัติ {pendingCount}</span>
                    <span className="text-green-600">อนุมัติแล้ว {approvedCount}</span>
                    <span className="text-orange-600">เลยเวลา {overdueCount}</span>
                  </div>
                </CardHeader>
                <CardContent>{renderMemoList(pendingMemos, true)}</CardContent>
              </Card>
            </TabsContent>
          )}

           <TabsContent value="mine">
             <Card>
               <CardHeader className="flex flex-row items-center justify-between pb-3">
                 <CardTitle className="text-base">Memo ของฉัน</CardTitle>
                   <Button size="sm" onClick={() => setIsCreating(true)}>
                     <Plus className="h-4 w-4 mr-1" />
                     สร้าง Memo
                  </Button>
               </CardHeader>
               <CardContent>{renderMemoList(myMemos, false)}</CardContent>
             </Card>
           </TabsContent>
        </Tabs>
      </div>

      {/* Memo Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
            <DialogTitle>{selectedMemo?.memoNumber} - {selectedMemo?.title}</DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsDetailOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          {selectedMemo && detailTemplate && (
              <div className="p-6">
                <div className="memo-font border-2 border-slate-900">
                  {/* MEMO Header */}
                  <div className="border-b-2 border-slate-900 py-3 text-center">
                    <h1 className="text-2xl font-bold tracking-[0.3em] text-slate-900">MEMO</h1>
                  </div>
                {/* Document Body */}
                <div className="p-6 space-y-0">
                  {detailTemplate.fields.filter((f) => f.type !== 'memo_type' && f.type !== 'section_title').map((field) => (
                    <SectionRenderer
                      key={field.id}
                      field={field}
                      value={selectedMemo.formData?.[field.id]}
                      formData={selectedMemo.formData as Record<string, unknown>}
                      readonly={true}
                      ownerUser={detailOwnerUser}
                      users={allUsers}
                      typography={detailTemplate.typography}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex items-center justify-end gap-2">
            {selectedMemo && (selectedMemo.status === 'waiting' || selectedMemo.status === 'new') && isApprover && !hasUserSigned(selectedMemo, user.id) && new Date(selectedMemo.deadlineAt) >= new Date() && (
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => { handleApprove(selectedMemo.id); setIsDetailOpen(false); }}>
                <CheckCircle className="h-4 w-4 mr-1" />
                อนุมัติ
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>ปิด</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Memo - Full Page Form */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-slate-200 overflow-y-auto">
          <MemoDocumentForm
            templates={templates}
            selectedTemplate={selectedTemplate}
            formData={sectionFormData}
            onSelectTemplate={(t) => { setSelectedTemplate(t); setSectionFormData(initFormData(t)); }}
            onChange={(fieldId, val) => setSectionFormData({ ...sectionFormData, [fieldId]: val })}
            onSubmit={handleCreateMemo}
            onCancel={() => { setIsCreating(false); setSelectedTemplate(null); setSectionFormData({}); }}
            creating={creating}
            ownerUser={user}
            users={allUsers}
          />
        </div>
      )}
    </div>
  );
}
