'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useDashboardTitle } from '@/app/dashboard/layout';
import { subscribeToMemos } from '@/lib/memos';
import { Memo } from '@/types';
import { formatDate, formatTime, DateTimeCell } from '@/utils/cn';

export default function DashboardPage() {
  useAuth();
  const { setTitle } = useDashboardTitle();
  const [memos, setMemos] = useState<Memo[]>([]);

  useEffect(() => { setTitle('แดชบอร์ด'); }, [setTitle]);

  useEffect(() => {
    const unsubscribe = subscribeToMemos((data) => {
      setMemos(data);
    });

    return () => unsubscribe();
  }, []);

  const stats = {
    total: memos.length,
    new: memos.filter((m) => m.status === 'new').length,
    waiting: memos.filter((m) => m.status === 'waiting').length,
    approved: memos.filter((m) => m.status === 'approved').length,
    rejected: memos.filter((m) => m.status === 'rejected').length,
    cancel: memos.filter((m) => m.status === 'cancel').length,
  };

  const recentMemos = memos.slice(0, 5);

  const nearDeadline = memos
    .filter((m) => {
      if (m.status === 'approved' || m.status === 'rejected' || m.status === 'cancel') return false;
      const deadline = new Date(m.deadlineAt);
      const now = new Date();
      const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysLeft <= 3 && daysLeft >= 0;
    })
    .slice(0, 5);

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Memo ทั้งหมด</CardTitle>
                <FileText className="h-4 w-4 text-slate-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ใหม่</CardTitle>
                <FileText className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.new}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">รออนุมัติ</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.waiting}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">อนุมัติแล้ว</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ปฏิเสธ/ยกเลิก</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.rejected + stats.cancel}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Memo ล่าสุด</CardTitle>
                <CardDescription>รายการ Memo ที่สร้างล่าสุดในระบบ</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentMemos.length === 0 ? (
                    <p className="text-center text-slate-600 py-4">ยังไม่มี Memo</p>
                  ) : (
                    recentMemos.map((memo) => (
                      <div key={memo.id} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between">
                          <p className="text-sm font-medium truncate flex-1">{memo.title}</p>
                          <div className="ml-3 shrink-0">{getStatusBadge(memo.status)}</div>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-slate-600">{memo.ownerName}</p>
                          <p className="text-xs text-slate-500">{formatDate(memo.createdAt)} {memo.createdAt.getFullYear() + 543} {formatTime(memo.createdAt)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Memo ใกล้หมดอายุ</CardTitle>
                <CardDescription>Memo ที่เหลือเวลาไม่เกิน 3 วัน</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {nearDeadline.length === 0 ? (
                    <p className="text-center text-slate-600 py-4">ไม่มี Memo ที่ใกล้หมดอายุ</p>
                  ) : (
                    nearDeadline.map((memo) => (
                      <div key={memo.id} className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                        <div className="space-y-1 min-w-0">
                          <p className="text-sm font-medium truncate">{memo.title}</p>
                          <p className="text-xs text-slate-600">
                            หมดอายุ: <DateTimeCell date={memo.deadlineAt} />
                          </p>
                        </div>
                        {getStatusBadge(memo.status)}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
    </div>
  );
}
