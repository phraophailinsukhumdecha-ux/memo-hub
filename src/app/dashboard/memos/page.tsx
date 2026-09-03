'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Search, XCircle, Download, Printer } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useDashboardTitle } from '@/app/dashboard/layout';
import { subscribeToMemos, cancelMemo } from '@/lib/memos';
import { subscribeToTemplates } from '@/lib/templates';
import { subscribeToUsers } from '@/lib/users';
import { downloadMemoPdf, printMemo } from '@/lib/memo-pdf';
import { Memo, MemoTemplate, User } from '@/types';
import { formatDate, DateTimeCell } from '@/utils/cn';

export default function MemosPage() {
  const { user, isAdmin } = useAuth();
  const { setTitle } = useDashboardTitle();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [templates, setTemplates] = useState<MemoTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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

  const filteredMemos = memos.filter((memo) => {
    const matchesSearch =
      memo.title.includes(searchQuery) ||
      memo.id.includes(searchQuery) ||
      memo.ownerName.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || memo.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
      </div>

      <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">เลขที่ Memo</TableHead>
                <TableHead>หัวข้อ</TableHead>
                <TableHead className="w-32">เทมเพลต</TableHead>
                <TableHead className="w-24">สถานะ</TableHead>
                <TableHead className="w-32">ผู้สร้าง</TableHead>
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
