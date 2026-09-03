'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Search, XCircle, Download, Printer } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useDashboardTitle } from '@/app/dashboard/layout';
import { subscribeToMemos, createMemo, cancelMemo } from '@/lib/memos';
import { subscribeToTemplates } from '@/lib/templates';
import { subscribeToUsers } from '@/lib/users';
import { downloadMemoPdf, printMemo } from '@/lib/memo-pdf';
import { Memo, MemoTemplate, User } from '@/types';
import { formatDate, DateTimeCell } from '@/utils/cn';
import { SectionRenderer } from '@/components/memo-sections';

export default function MemosPage() {
  const { user, isAdmin } = useAuth();
  const { setTitle } = useDashboardTitle();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [templates, setTemplates] = useState<MemoTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedMemoType, setSelectedMemoType] = useState('');
  const [memoTitle, setMemoTitle] = useState('');
  const [sectionFormData, setSectionFormData] = useState<Record<string, unknown>>({});
  const [creating, setCreating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => { setTitle('Memo ทั้งหมด'); }, [setTitle]);

  useEffect(() => {
    if (!user) return;

    const unsubscribeMemos = subscribeToMemos((data) => {
      setMemos(data);
    });

    const unsubscribeTemplates = subscribeToTemplates((data) => {
      setTemplates(data);
    });

    const unsubscribeUsers = subscribeToUsers((data) => {
      setAllUsers(data);
    });

    return () => {
      unsubscribeMemos();
      unsubscribeTemplates();
      unsubscribeUsers();
    };
  }, [user]);

  const selectedTemplateObj = templates.find((t) => t.id === selectedMemoType);

  useEffect(() => {
    if (selectedTemplateObj) {
      setMemoTitle(selectedTemplateObj.name);
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().slice(0, 5);
      const initialData: Record<string, unknown> = {};
      selectedTemplateObj.fields.forEach((field) => {
        if (field.type === 'checkbox_group') {
          initialData[field.id] = [];
        } else if (field.type === 'dropdown_select') {
          initialData[field.id] = '';
        } else if (field.type === 'memo_type') {
          initialData[field.id] = selectedTemplateObj.name;
        } else if (field.type === 'form_row') {
          const rowValue: Record<string, string> = {};
          const cfgFields = (field.fieldConfig as { fields?: { name: string; type: string; label?: string }[] })?.fields || [];
          cfgFields.forEach((f) => {
            const isDateField = f.type === 'date' || f.name.toLowerCase().includes('date') || (f.label || '').includes('วันที่');
            rowValue[f.name] = isDateField ? todayStr : '';
          });
          initialData[field.id] = rowValue;
        } else if (field.type === 'approval_grid') {
          const gridCfg = field.fieldConfig as { columns?: { title: string }[]; showTime?: boolean } | undefined;
          const cols = gridCfg?.columns || [];
          const gridValue: Record<string, { date: string; time: string; name: string; signerTitle: string }> = {};
          cols.forEach((_, i) => {
            if (i === 0) {
              gridValue[`col_${i}`] = { date: todayStr, time: timeStr, name: user?.displayName || '', signerTitle: user?.department || '' };
            } else if (i === cols.length - 1) {
              const ceoUser = allUsers.find((u) => u.position === 'CEO');
              gridValue[`col_${i}`] = { date: todayStr, time: timeStr, name: ceoUser?.displayName || '', signerTitle: ceoUser?.position || 'CEO' };
            } else {
              gridValue[`col_${i}`] = { date: todayStr, time: timeStr, name: '', signerTitle: '' };
            }
          });
          initialData[field.id] = gridValue;
        } else if (field.type === 'body_text') {
          initialData[field.id] = (field.fieldConfig as Record<string, unknown>)?.defaultValue || '';
        } else {
          initialData[field.id] = '';
        }
      });
      setSectionFormData(initialData);
    }
  }, [selectedTemplateObj, selectedMemoType]);

  const filteredMemos = memos.filter((memo) => {
    const matchesSearch =
      memo.title.includes(searchQuery) ||
      memo.id.includes(searchQuery) ||
      memo.ownerName.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || memo.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateMemo = async () => {
    if (!user || !selectedTemplateObj || !memoTitle) return;

    setCreating(true);
    try {
      await createMemo(
        selectedTemplateObj.id,
        memoTitle,
        sectionFormData,
        user.id,
        user.displayName,
        user.department
      );
      setIsCreateDialogOpen(false);
      setSelectedMemoType('');
      setSectionFormData({});
    } catch (error) {
      console.error('Error creating memo:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleSectionChange = (fieldId: string, value: unknown) => {
    setSectionFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleCancelMemo = async (memoId: string) => {
    if (confirm('คุณต้องการยกเลิก Memo นี้ใช่หรือไม่?')) {
      await cancelMemo(memoId);
    }
  };

  const handleDownloadPdf = async (memo: Memo) => {
    setDownloadingId(memo.id);
    try {
      const tpl = templates.find((t) => t.id === memo.templateId);
      const ownerUserData = allUsers.find((u) => u.id === memo.ownerId) || null;
      await downloadMemoPdf(memo, tpl, undefined, ownerUserData, allUsers, []);
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePrint = (memo: Memo) => {
    const tpl = templates.find((t) => t.id === memo.templateId);
    const ownerUserData = allUsers.find((u) => u.id === memo.ownerId) || null;
    printMemo(memo, tpl, undefined, ownerUserData, allUsers, []);
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-600" />
            <Input
              placeholder="ค้นหา Memo..."
              className="w-64 pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="สถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              <SelectItem value="new">ใหม่</SelectItem>
              <SelectItem value="waiting">รออนุมัติ</SelectItem>
              <SelectItem value="approved">อนุมัติแล้ว</SelectItem>
              <SelectItem value="rejected">ปฏิเสธ</SelectItem>
              <SelectItem value="cancel">ยกเลิก</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              สร้าง Memo ใหม่
            </Button>
          </DialogTrigger>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>สร้าง Memo ใหม่</DialogTitle>
            <DialogDescription>เลือกประเภท Memo และกรอกข้อมูล Memo</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>ประเภท Memo *</Label>
              <Select value={selectedMemoType} onValueChange={setSelectedMemoType}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกประเภท" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplateObj && (
              <div className="space-y-3 border-t pt-4">
                <Label className="text-sm font-semibold">ข้อมูลในเทมเพลต</Label>
                {selectedTemplateObj.fields.map((field) => {
                  if (field.type === 'memo_type') return null;

                  return (
                    <div key={field.id}>
                      {field.type !== 'section_title' && field.type !== 'company_header' && (
                        <Label className="text-xs text-slate-600 mb-1 block">{field.label}</Label>
                      )}
                      <SectionRenderer
                        field={field}
                        value={sectionFormData[field.id]}
                        onChange={(value) => handleSectionChange(field.id, value)}
                        readonly={false}
                        memoType={selectedTemplateObj.name}
                        ownerUser={user}
                        users={allUsers}
                        groups={[]}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleCreateMemo}
              disabled={!selectedMemoType || creating}
            >
              {creating ? 'กำลังสร้าง...' : 'สร้าง Memo'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>

      <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">เลขที่ Memo</TableHead>
                <TableHead>หัวข้อ</TableHead>
                <TableHead className="w-32">เทมเพลต</TableHead>
                <TableHead className="w-24">สถานะ</TableHead>
                <TableHead className="w-48">ผู้สร้าง</TableHead>
                <TableHead className="w-32">ผู้อนุมัติปัจจุบัน</TableHead>
                <TableHead className="w-36">วันที่สร้าง</TableHead>
                <TableHead className="w-36">Deadline</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMemos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-slate-600 py-8">
                    ไม่พบข้อมูล Memo
                  </TableCell>
                </TableRow>
              ) : (
                filteredMemos.map((memo) => (
                  <TableRow key={memo.id}>
                    <TableCell className="font-mono text-sm">{memo.id}</TableCell>
                    <TableCell className="font-medium">{memo.title}</TableCell>
                    <TableCell>{memo.templateName}</TableCell>
                    <TableCell>{getStatusBadge(memo.status)}</TableCell>
                    <TableCell>{memo.ownerName}</TableCell>
                    <TableCell>{memo.currentApprovalLevel || '-'}</TableCell>
                    <TableCell><DateTimeCell date={memo.createdAt} /></TableCell>
                    <TableCell><DateTimeCell date={memo.deadlineAt} /></TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadPdf(memo)}
                          disabled={downloadingId === memo.id}
                          title="ดาวน์โหลด PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePrint(memo)}
                          title="พิมพ์"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        {(memo.status === 'new' || memo.status === 'waiting') &&
                          memo.ownerId === user?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleCancelMemo(memo.id)}
                            title="ยกเลิก"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
      </div>
    </div>
  );
}
