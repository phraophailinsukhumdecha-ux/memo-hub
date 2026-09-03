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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Download, Printer, Trash2, CheckCircle, Clock, FileText, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { subscribeToMemos, approveMemo, cancelMemo, createMemo } from '@/lib/memos';
import { subscribeToTemplates } from '@/lib/templates';
import { subscribeToUsers } from '@/lib/users';
import { downloadMemoPdf, printMemo } from '@/lib/memo-pdf';
import { Memo, MemoTemplate, User } from '@/types';
import { SectionRenderer } from '@/components/memo-sections';

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

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
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
    const gridValue: Record<string, { name?: string; signerTitle?: string; date?: string; time?: string }> = {};
    cols.forEach((_, i) => {
      if (i === 0) {
        gridValue[`col_${i}`] = { date: todayStr, time: timeStr, name: user?.displayName || '', signerTitle: user?.department || '' };
      } else if (i === cols.length - 1) {
        gridValue[`col_${i}`] = { date: todayStr, time: timeStr, name: 'จิรพล ยาวะพันธุ์', signerTitle: 'CEO' };
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

  const detailTemplate = useMemo((): MemoTemplate | null => {
    if (!selectedMemo?.templateId) return null;
    return templates.find((t) => t.id === selectedMemo.templateId) || null;
  }, [selectedMemo, templates]);

  const detailOwnerUser = useMemo(() => {
    if (!selectedMemo?.ownerId) return null;
    return allUsers.find((u) => u.id === selectedMemo.ownerId) || null;
  }, [selectedMemo, allUsers]);

  const isApprover = user?.isApprover === true;
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

  const getStatusBadge = (memo: Memo) => {
    if (memo.status === 'approved') return <Badge className="bg-green-100 text-green-700 border-green-200">อนุมัติแล้ว</Badge>;
    if (memo.status === 'rejected') return <Badge className="bg-red-100 text-red-700 border-red-200">ถูกปฏิเสธ</Badge>;
    if (memo.status === 'cancel') return <Badge className="bg-slate-100 text-slate-700 border-slate-200">ยกเลิก</Badge>;
    if (new Date(memo.deadlineAt) < new Date()) return <Badge className="bg-orange-100 text-orange-700 border-orange-200">เลยเวลา</Badge>;
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
    if (!confirm('คุณต้องการลบ memo นี้ใช่หรือไม่?')) return;
    await cancelMemo(memoId);
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

  const handleCreateMemo = async () => {
    if (!selectedTemplate || !user) return;
    setCreating(true);
    try {
      const formData = { ...sectionFormData };

      await createMemo(selectedTemplate.id, selectedTemplate.name, formData, user.id, user.displayName, user.department);
      setIsCreateDialogOpen(false);
      setSelectedTemplate(null);
      setSectionFormData({});
    } catch (e) {
      console.error(e);
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
      {items.map((memo) => (
        <div key={memo.id} className="flex items-center justify-between border rounded-lg px-4 py-3 hover:bg-slate-50 transition-colors">
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
          <div className="flex items-center gap-1 ml-3 shrink-0">
            {showApprove && (memo.status === 'waiting' || memo.status === 'new') && new Date(memo.deadlineAt) >= new Date() && (
              <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleApprove(memo.id)} disabled={approvingId === memo.id}>
                <CheckCircle className="h-4 w-4 mr-1" />
                อนุมัติ
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(memo)} disabled={downloadingId === memo.id}>
              <Download className="h-4 w-4" />
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
                 <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedMemo?.memoNumber} - {selectedMemo?.title}</DialogTitle>
          </DialogHeader>
          {selectedMemo && detailTemplate && (
            <div className="space-y-4">
              {detailTemplate.fields.filter((f) => f.type !== 'memo_type').map((field) => (
                <SectionRenderer
                  key={field.id}
                  field={field}
                  value={selectedMemo.formData?.[field.id]}
                  readonly={true}
                  ownerUser={detailOwnerUser}
                  users={allUsers}
                />
              ))}
            </div>
          )}
          <DialogFooter className="flex-row gap-2 sm:gap-0">
            {selectedMemo && (selectedMemo.status === 'waiting' || selectedMemo.status === 'new') && isApprover && new Date(selectedMemo.deadlineAt) >= new Date() && (
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => { handleApprove(selectedMemo.id); setIsDetailOpen(false); }}>
                <CheckCircle className="h-4 w-4 mr-1" />
                อนุมัติ
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>ปิด</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Memo Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        setIsCreateDialogOpen(open);
        if (!open) { setSelectedTemplate(null); setSectionFormData({}); }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>สร้าง Memo</DialogTitle>
            <DialogDescription>เลือกประเภท Memo</DialogDescription>
          </DialogHeader>
          {templates.length === 0 && <p className="text-center text-slate-600 py-4 text-sm">ยังไม่มีเทมเพลต</p>}
          {templates.length > 0 && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">เลือกประเภท Memo</label>
              <Select
                value={selectedTemplate?.id || ''}
                onValueChange={(val) => {
                  const t = templates.find((x) => x.id === val);
                  if (t) { setSelectedTemplate(t); setSectionFormData(initFormData(t)); }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกเทมเพลต" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {selectedTemplate && (
            <div className="space-y-4">
              {selectedTemplate.fields.filter((f) => f.type !== 'memo_type').map((field) => (
                <SectionRenderer
                  key={field.id}
                  field={field}
                  value={sectionFormData[field.id]}
                  readonly={false}
                  ownerUser={user}
                  users={allUsers}
                  onChange={(val) => setSectionFormData({ ...sectionFormData, [field.id]: val })}
                />
              ))}
            </div>
          )}
          {selectedTemplate && (
            <DialogFooter>
              <Button variant="outline" onClick={() => { setSelectedTemplate(null); setSectionFormData({}); }}>ยกเลิก</Button>
              <Button onClick={handleCreateMemo} disabled={creating}>
                {creating ? 'กำลังสร้าง...' : 'สร้าง Memo'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
