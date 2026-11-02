'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useDashboardTitle } from '@/app/dashboard/layout';
import { subscribeToUsers } from '@/lib/users';
import { isUserOnline } from '@/lib/presence';
import { User } from '@/types';
import { formatRelativeTime, DateTimeCell } from '@/utils/cn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users } from 'lucide-react';

function roleLabel(role: User['role']): string {
  return role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้';
}

export default function OnlineUsersPage() {
  const { setTitle } = useDashboardTitle();
  const [users, setUsers] = useState<User[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => { setTitle('ผู้ใช้ออนไลน์'); }, [setTitle]);

  useEffect(() => {
    const unsubscribe = subscribeToUsers((data) => setUsers(data));
    return () => unsubscribe();
  }, []);

  // Re-evaluate the online threshold even when no heartbeat arrives.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const onlineUsers = useMemo(
    () => users.filter((user) => isUserOnline(user, now)),
    [users, now]
  );

  const visibleUsers = showAll ? users : onlineUsers;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />ผู้ใช้ออนไลน์
          </CardTitle>
          <CardDescription>
            บัญชีที่กำลังเข้าสู่ระบบอยู่ (อัปเดตทุกนาที — ถือว่าออนไลน์หากมีความเคลื่อนไหวภายใน 3 นาที)
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Badge className="border-green-200 bg-green-100 text-green-700">
            ออนไลน์ตอนนี้ {onlineUsers.length} คน
          </Badge>
          <span className="text-sm text-slate-600">จากทั้งหมด {users.length} บัญชี</span>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => setShowAll((value) => !value)}
          >
            {showAll ? 'แสดงเฉพาะออนไลน์' : 'แสดงทั้งหมด'}
          </Button>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>ชื่อ</TableHead>
              <TableHead>แผนก</TableHead>
              <TableHead>ตำแหน่ง</TableHead>
              <TableHead>บทบาท</TableHead>
              <TableHead>เข้าสู่ระบบล่าสุด</TableHead>
              <TableHead>สถานะ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-slate-600">
                  ยังไม่มีผู้ใช้ออนไลน์ในขณะนี้
                </TableCell>
              </TableRow>
            ) : (
              visibleUsers.map((user) => {
                const online = isUserOnline(user, now);
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <span
                        className={`inline-block h-2.5 w-2.5 rounded-full ${online ? 'bg-green-500' : 'bg-slate-300'}`}
                        title={online ? 'ออนไลน์' : 'ออฟไลน์'}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{user.displayName}</TableCell>
                    <TableCell>{user.department || '-'}</TableCell>
                    <TableCell>{user.position || '-'}</TableCell>
                    <TableCell>{roleLabel(user.role)}</TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {user.lastLoginAt ? <DateTimeCell date={new Date(user.lastLoginAt)} /> : '-'}
                    </TableCell>
                    <TableCell>
                      {online ? (
                        <Badge className="border-green-200 bg-green-100 text-green-700">ออนไลน์</Badge>
                      ) : (
                        <span className="text-sm text-slate-500">
                          ออฟไลน์
                          {user.lastSeenAt ? ` (${formatRelativeTime(new Date(user.lastSeenAt))})` : ''}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
