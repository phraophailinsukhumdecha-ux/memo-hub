'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle, Clock, XCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useDashboardTitle } from '@/app/dashboard/layout';
import { subscribeToMemos } from '@/lib/memos';
import { subscribeToEventLogs } from '@/lib/event-logs';
import { Memo, EventLog } from '@/types';
import { formatDate, formatTime, DateTimeCell } from '@/utils/cn';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { startOfWeek, subWeeks, addWeeks, format } from 'date-fns';

const STATUS_SEGMENTS = [
  { key: 'new', label: 'ใหม่', color: '#3b82f6' },
  { key: 'waiting', label: 'รออนุมัติ', color: '#eab308' },
  { key: 'approved', label: 'อนุมัติแล้ว', color: '#22c55e' },
  { key: 'rejected', label: 'ปฏิเสธ', color: '#ef4444' },
  { key: 'cancel', label: 'ยกเลิก', color: '#94a3b8' },
  { key: 'draft', label: 'แบบร่าง', color: '#64748b' },
] as const;

export default function DashboardPage() {
  useAuth();
  const { setTitle } = useDashboardTitle();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [logs, setLogs] = useState<EventLog[]>([]);

  useEffect(() => { setTitle('แดชบอร์ด'); }, [setTitle]);

  useEffect(() => {
    const unsubscribe = subscribeToMemos((data) => {
      setMemos(data);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToEventLogs((data) => setLogs(data), 10);
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

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of memos) counts[m.status] = (counts[m.status] || 0) + 1;
    return STATUS_SEGMENTS.filter((s) => (counts[s.key] || 0) > 0).map((s) => ({
      name: s.label,
      value: counts[s.key] || 0,
      color: s.color,
    }));
  }, [memos]);

  const weeklyData = useMemo(() => {
    const currentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 8 }, (_, i) => {
      const weekStart = subWeeks(currentWeek, 7 - i);
      const weekEnd = addWeeks(weekStart, 1);
      const count = memos.filter((m) => {
        const created = new Date(m.createdAt);
        return created >= weekStart && created < weekEnd;
      }).length;
      return { label: format(weekStart, 'dd/MM'), count };
    });
  }, [memos]);

  const recentMemos = memos.slice(0, 5);

  const nearDeadline = memos
    .filter((m) => {
      if (m.status === 'approved' || m.status === 'rejected' || m.status === 'cancel' || m.status === 'draft') return false;
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
      case 'draft': return <Badge variant="draft">แบบร่าง</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getActionBadge = (action: string) => {
    if (action.includes('CREATED')) return <Badge variant="new">สร้าง</Badge>;
    if (action.includes('APPROVED')) return <Badge variant="approved">อนุมัติ</Badge>;
    if (action.includes('REJECTED')) return <Badge variant="rejected">ปฏิเสธ</Badge>;
    if (action.includes('CANCELLED')) return <Badge variant="cancel">ยกเลิก</Badge>;
    if (action.includes('UPDATED')) return <Badge variant="waiting">แก้ไข</Badge>;
    if (action.includes('SETTING')) return <Badge variant="secondary">ตั้งค่า</Badge>;
    return <Badge>{action}</Badge>;
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

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>สัดส่วนสถานะ</CardTitle>
                <CardDescription>จำนวน Memo แยกตามสถานะ</CardDescription>
              </CardHeader>
              <CardContent>
                {statusData.length === 0 ? (
                  <p className="text-center text-slate-600 py-8">ยังไม่มีข้อมูล</p>
                ) : (
                  <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {statusData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend
                          verticalAlign="bottom"
                          formatter={(value) => <span className="text-xs text-slate-700">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>แนวโน้มการสร้าง Memo</CardTitle>
                <CardDescription>จำนวน Memo ที่สร้างในรอบ 8 สัปดาห์ล่าสุด</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="count" name="จำนวน Memo" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
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

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>กิจกรรมล่าสุด</CardTitle>
                  <CardDescription>10 รายการล่าสุดในระบบ</CardDescription>
                </div>
                <Link href="/dashboard/event-logs" className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
                  ดูทั้งหมด <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-center text-slate-600 py-4">ยังไม่มีกิจกรรม</p>
              ) : (
                <div className="divide-y">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 py-2.5">
                      <div className="shrink-0">{getActionBadge(log.action)}</div>
                      <p className="text-sm text-slate-700 truncate flex-1">{log.details}</p>
                      <p className="text-xs text-slate-500 shrink-0">{log.userName}</p>
                      <p className="text-xs text-slate-400 shrink-0 w-40 text-right"><DateTimeCell date={log.timestamp} /></p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
    </div>
  );
}
