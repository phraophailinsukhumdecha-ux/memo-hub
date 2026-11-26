'use client';

import React, { useState, useEffect } from 'react';
import { useDashboardTitle } from '@/app/dashboard/layout';
import { subscribeToEventLogs } from '@/lib/event-logs';
import { EventLog } from '@/types';
import { formatDate, DateTimeCell } from '@/utils/cn';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function EventLogsPage() {
  const { setTitle } = useDashboardTitle();
  const [logs, setLogs] = useState<EventLog[]>([]);

  useEffect(() => { setTitle('Event Logs'); }, [setTitle]);

  useEffect(() => {
    const unsubscribe = subscribeToEventLogs((data) => {
      setLogs(data);
    });

    return () => unsubscribe();
  }, []);

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
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        บันทึกกิจกรรมของผู้ใช้ในระบบ (Audit Trail)
      </p>

      <div className="rounded-lg border bg-white max-sm:hidden">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-slate-600">ยังไม่มี Event Log</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36">วันที่/เวลา</TableHead>
                <TableHead className="w-32 hidden md:table-cell">ผู้กระทำ</TableHead>
                <TableHead className="w-28">ประเภท</TableHead>
                <TableHead className="w-28 hidden md:table-cell">ช่องทาง</TableHead>
                <TableHead>รายละเอียด</TableHead>
                <TableHead className="w-64 hidden md:table-cell">หมายเหตุ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const channel = log.metadata?.channel;
                const comment = typeof log.metadata?.comment === 'string' ? log.metadata.comment : '';
                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm"><DateTimeCell date={log.timestamp} /></TableCell>
                    <TableCell className="text-sm hidden md:table-cell">{log.userName}</TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {channel === 'email' ? (
                        <Badge className="border-purple-200 bg-purple-100 text-purple-700">อีเมล</Badge>
                      ) : channel === 'web' ? (
                        <Badge className="border-blue-200 bg-blue-100 text-blue-700">ระบบ</Badge>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{log.details}</TableCell>
                    <TableCell className="text-sm text-slate-600 hidden md:table-cell">{comment || '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Mobile cards: show every field instead of hiding columns */}
      <div className="space-y-2 sm:hidden">
        {logs.length === 0 ? (
          <div className="rounded-lg border bg-white p-8 text-center text-slate-600">ยังไม่มี Event Log</div>
        ) : (
          logs.map((log) => {
            const channel = log.metadata?.channel;
            const comment = typeof log.metadata?.comment === 'string' ? log.metadata.comment : '';
            return (
              <div key={log.id} className="rounded-lg border bg-white p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500"><DateTimeCell date={log.timestamp} /></span>
                  <div className="shrink-0">{getActionBadge(log.action)}</div>
                </div>
                <p className="text-sm text-slate-900 break-words">{log.details}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span>
                    ผู้กระทำ: <span className="text-slate-700">{log.userName || '-'}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    ช่องทาง:{' '}
                    {channel === 'email' ? (
                      <Badge className="border-purple-200 bg-purple-100 text-purple-700">อีเมล</Badge>
                    ) : channel === 'web' ? (
                      <Badge className="border-blue-200 bg-blue-100 text-blue-700">ระบบ</Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </span>
                </div>
                <p className="text-xs text-slate-500 break-words">
                  <span className="text-slate-600">หมายเหตุ:</span> {comment || '—'}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
