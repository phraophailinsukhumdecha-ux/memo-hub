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

      <div className="rounded-lg border bg-white">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-slate-600">ยังไม่มี Event Log</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36">วันที่/เวลา</TableHead>
                <TableHead className="w-32">ผู้กระทำ</TableHead>
                <TableHead className="w-28">ประเภท</TableHead>
                <TableHead>รายละเอียด</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm"><DateTimeCell date={log.timestamp} /></TableCell>
                  <TableCell className="text-sm">{log.userName}</TableCell>
                  <TableCell>{getActionBadge(log.action)}</TableCell>
                  <TableCell className="text-sm">{log.details}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
