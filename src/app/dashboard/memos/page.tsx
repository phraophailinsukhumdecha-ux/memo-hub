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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Search, Download, Printer, XCircle, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useDashboardTitle } from '@/app/dashboard/layout';
import { subscribeToMemos, createMemo, cancelMemo } from '@/lib/memos';
import { subscribeToTemplates } from '@/lib/templates';
import { subscribeToUsers } from '@/lib/users';
import { downloadMemoPdf, printMemo } from '@/lib/memo-pdf';
import { Memo, MemoTemplate, User } from '@/types';
import { formatDate, DateTimeCell } from '@/utils/cn';
import { MemoDocumentForm } from '@/components/memo-document-form';
import { SectionRenderer } from '@/components/memo-sections';

export default function MemosPage() {
  const { user, isAdmin } = useAuth();
  const { setTitle } = useDashboardTitle();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [templates, setTemplates] = useState<MemoTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTemplateObj, setSelectedTemplateObj] = useState<MemoTemplate | null>(null);
  const [sectionFormData, setSectionFormData] = useState<Record<string, unknown>>({});
  const [creating, setCreating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

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

  const filteredMemos = memos.filter((memo) => {
    const matchesSearch =
      memo.title.includes(searchQuery) ||
      memo.id.includes(searchQuery) ||
      memo.ownerName.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || memo.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const initFormData = (t: MemoTemplate) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().slice(0, 5);
    const initialData: Record<string, unknown> = {};
    t.fields.forEach((field) => {
      if (field.type === 'checkbox_group') {
        initialData[field.id] = [];
      } else if (field.type === 'dropdown_select') {
        initialData[field.id] = '';
      } else if (field.type === 'memo_type') {
        initialData[field.id] = t.name;
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
            gridValue[`col_${i}`] = { date: todayStr, time: timeStr, name: '', signerTitle: '' };
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
    return initialData;
  };

  const handleCreateMemo = async (sendEmail = false) => {
    if (!selectedTemplateObj || !user) return;

    // Validate required fields in form_row
    const formRowField = selectedTemplateObj.fields.find((f) => f.type === 'form_row');
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
      await createMemo(selectedTemplateObj.id, selectedTemplateObj.name, formData, user.id, user.displayName, user.department);
      setIsCreating(false);
      setSelectedTemplateObj(null);
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

        <Button onClick={() => setIsCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          สร้าง Memo ใหม่
        </Button>
      </div>

      <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44 whitespace-nowrap">เลขที่ Memo</TableHead>
                <TableHead className="w-48 whitespace-nowrap">หัวข้อ</TableHead>
                <TableHead className="w-40 whitespace-nowrap">เทมเพลต</TableHead>
                <TableHead className="w-32 whitespace-nowrap">สถานะ</TableHead>
                <TableHead className="w-52 whitespace-nowrap">ผู้สร้าง</TableHead>
                <TableHead className="w-40 whitespace-nowrap">ผู้อนุมัติปัจจุบัน</TableHead>
                <TableHead className="w-44 whitespace-nowrap">วันที่สร้าง</TableHead>
                <TableHead className="w-44 whitespace-nowrap">Deadline</TableHead>
                <TableHead className="w-32"></TableHead>
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
                    <TableCell className="font-mono text-sm whitespace-nowrap cursor-pointer hover:text-blue-600" onClick={() => { setSelectedMemo(memo); setIsDetailOpen(true); }}>{memo.id}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap cursor-pointer hover:text-blue-600" onClick={() => { setSelectedMemo(memo); setIsDetailOpen(true); }}>{memo.title}</TableCell>
                    <TableCell className="whitespace-nowrap">{memo.templateName}</TableCell>
                    <TableCell>{getStatusBadge(memo.status)}</TableCell>
                    <TableCell className="whitespace-nowrap">{memo.ownerName}</TableCell>
                    <TableCell className="whitespace-nowrap">{memo.currentApprovalLevel || '-'}</TableCell>
                    <TableCell className="whitespace-nowrap"><DateTimeCell date={memo.createdAt} /></TableCell>
                    <TableCell className="whitespace-nowrap"><DateTimeCell date={memo.deadlineAt} /></TableCell>
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

      {/* Memo Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
            <DialogTitle>{selectedMemo?.memoNumber} - {selectedMemo?.title}</DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsDetailOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          {selectedMemo && (() => {
            const detailTemplate = templates.find((t) => t.id === selectedMemo.templateId) || null;
            const detailOwnerUser = allUsers.find((u) => u.id === selectedMemo.ownerId) || null;
            if (!detailTemplate) return <p className="p-6 text-slate-500">ไม่พบเทมเพลต</p>;
            return (
              <div className="p-6">
                <div className="border-2 border-slate-900">
                  <div className="border-b-2 border-slate-900 py-3 text-center">
                    <h1 className="text-2xl font-bold tracking-[0.3em] text-slate-900">MEMO</h1>
                  </div>
                  <div className="p-6 space-y-0">
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
                </div>
              </div>
            );
          })()}
          <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex items-center justify-end">
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>ปิด</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Memo - Full Page Form */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-slate-200 overflow-y-auto">
          <MemoDocumentForm
            templates={templates}
            selectedTemplate={selectedTemplateObj}
            formData={sectionFormData}
            onSelectTemplate={(t) => { setSelectedTemplateObj(t); setSectionFormData(initFormData(t)); }}
            onChange={(fieldId, val) => setSectionFormData({ ...sectionFormData, [fieldId]: val })}
            onSubmit={handleCreateMemo}
            onCancel={() => { setIsCreating(false); setSelectedTemplateObj(null); setSectionFormData({}); }}
            creating={creating}
            ownerUser={user}
            users={allUsers}
          />
        </div>
      )}
    </div>
  );
}
