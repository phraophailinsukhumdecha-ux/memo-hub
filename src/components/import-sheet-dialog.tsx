'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Table2, CheckCircle } from 'lucide-react';
import { SheetImportConfig } from '@/types';

export interface ImportUserRow {
  username: string;
  displayName: string;
  position: string;
  department: string;
  password: string;
  email: string;
}

interface ImportSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  subtitle?: string;
  config?: SheetImportConfig;
  existingUsernames?: string[];
  existingPositions?: string[];
  existingDepartments?: string[];
  onConfigSave: (cfg: SheetImportConfig) => Promise<void>;
  onImport: (users: ImportUserRow[]) => Promise<void>;
}

function extractSheetId(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  const m = t.match(/\/spreadsheets\/d\/(?:e\/)?([a-zA-Z0-9_-]+)/);
  if (m) return t.includes('/d/e/') ? `e/${m[1]}` : m[1];
  if (/^e\/[a-zA-Z0-9_-]+$/.test(t) || /^[a-zA-Z0-9_-]+$/.test(t)) return t;
  return null;
}

function mapHeaders(headers: string[]) {
  const norm = headers.map((h) => (h || '').toLowerCase().replace(/\s+/g, ''));
  const find = (pred: (h: string) => boolean) => norm.findIndex(pred);
  return {
    username: find((h) => h.includes('รหัสพนักงาน') || h.includes('username')),
    displayName: find((h) => h.includes('ชื่อ') && !h.includes('ผู้ใช้')),
    position: find((h) => h.includes('ตำแหน่ง')),
    department: find((h) => h.includes('แผนก')),
    password: find((h) => h.includes('เบอร์') || h.includes('โทร') || h.includes('password')),
    email: find((h) => h.includes('เมล')),
  };
}

export function ImportSheetDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  config,
  existingUsernames = [],
  existingPositions = [],
  existingDepartments = [],
  onConfigSave,
  onImport,
}: ImportSheetDialogProps) {
  const [sheetId, setSheetId] = useState(config?.sheetId || '');
  const [gid, setGid] = useState(config?.gid || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleOpenChange = (o: boolean) => {
    onOpenChange(o);
  };

  const handleSave = async () => {
    if (loading) return;
    setError('');
    setSuccess('');

    const id = extractSheetId(sheetId);
    if (!id) {
      setError('Google Sheet ID ไม่ถูกต้อง');
      return;
    }
    const safeGid = gid.trim() || '0';
    if (!/^\d+$/.test(safeGid)) {
      setError('Sheet GID ต้องเป็นตัวเลข');
      return;
    }

    setLoading(true);
    try {
      const cfg: SheetImportConfig = { sheetId: id, gid: safeGid, columnRange: '' };
      await onConfigSave(cfg);

      const res = await fetch('/api/import-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetId: id, gid: cfg.gid }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.message || 'ดึงข้อมูลไม่สำเร็จ');
        return;
      }

      const headers: string[] = json.headers || [];
      const rows: string[][] = json.rows || [];
      const cols = mapHeaders(headers);
      if (cols.username < 0) {
        setError('ไม่พบคอลัมน์ "รหัสพนักงาน" ในชีท');
        return;
      }
      if (cols.password < 0) {
        setError('ไม่พบคอลัมน์ "เบอร์" (ใช้เป็นรหัสผ่าน) ในชีท');
        return;
      }
      if (cols.displayName < 0) {
        setError('ไม่พบคอลัมน์ "ชื่อ - นามสกุล" ในชีท');
        return;
      }

      const existingSet = new Set(existingUsernames);
      const seenInSheet = new Set<string>();
      const newUsers: ImportUserRow[] = [];
      let skipped = 0;
      let invalid = 0;

      for (const row of rows) {
        const username = (row[cols.username] || '').trim();
        const password = (row[cols.password] || '').trim();
        if (!username || !password) {
          invalid++;
          continue;
        }
        if (existingSet.has(username) || seenInSheet.has(username)) {
          skipped++;
          continue;
        }
        seenInSheet.add(username);
        newUsers.push({
          username,
          password,
          displayName: (row[cols.displayName] || '').trim() || username,
          position: cols.position >= 0 ? (row[cols.position] || '').trim() : '',
          department: cols.department >= 0 ? (row[cols.department] || '').trim() : '',
          email: cols.email >= 0 ? (row[cols.email] || '').trim() : '',
        });
      }

      if (newUsers.length === 0) {
        setSuccess(`บันทึกการตั้งค่าแล้ว — ไม่มีผู้ใช้ใหม่ (ข้าม ${skipped} คน${invalid ? `, ข้อมูลไม่ครบ ${invalid} คน` : ''})`);
        return;
      }

      const posSet = new Set(existingPositions);
      let newPos = 0;
      for (const u of newUsers) {
        if (u.position && !posSet.has(u.position)) {
          posSet.add(u.position);
          newPos++;
        }
      }
      const deptSet = new Set(existingDepartments);
      let newDept = 0;
      for (const u of newUsers) {
        if (u.department && !deptSet.has(u.department)) {
          deptSet.add(u.department);
          newDept++;
        }
      }

      const lines = [
        `พบผู้ใช้ ${rows.length} คน — ใหม่ ${newUsers.length} / ข้าม ${skipped}${invalid ? ` / ข้อมูลไม่ครบ ${invalid}` : ''}`,
        `ตำแหน่งใหม่ในดรอปดาว +${newPos}, แผนกใหม่ +${newDept}`,
        '',
        'ผู้นำเข้าจะยังไม่มีสิทธิ์อนุมัติ (เปิดภายหลังได้ในหน้าผู้ใช้)',
        'ต้องการนำเข้าใช่หรือไม่?',
      ];
      if (!confirm(lines.join('\n'))) {
        setSuccess('บันทึกการตั้งค่าแล้ว ยังไม่นำเข้าข้อมูล');
        return;
      }

      await onImport(newUsers);
      setSuccess(
        `นำเข้าสำเร็จ ${newUsers.length} คน (ข้าม ${skipped}) — เพิ่มตำแหน่ง +${newPos}, แผนก +${newDept}`
      );
    } catch {
      setError('บันทึกการตั้งค่า/นำเข้าไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Table2 className="h-5 w-5 text-red-500" />
            {title || 'เชื่อมต่อ Google Sheet'}
          </DialogTitle>
          <DialogDescription>
            {subtitle || 'นำเข้ารายชื่อผู้ใช้จาก Google Sheet — ตำแหน่ง/แผนกจะเข้าดรอปดาวข้อมูลหลักอัตโนมัติ'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Google Sheet ID</Label>
            <Input
              value={sheetId}
              onChange={(e) => { setSheetId(e.target.value); setError(''); setSuccess(''); }}
              placeholder="วาง Google Sheet ID ที่นี่"
              disabled={loading}
            />
          </div>

          <div className="grid gap-2">
            <Label>Sheet GID</Label>
            <Input
              value={gid}
              onChange={(e) => { setGid(e.target.value); setError(''); setSuccess(''); }}
              placeholder="เช่น 0"
              disabled={loading}
            />
            <p className="text-xs text-slate-500">คัดลอกจาก URL ของชีท (เช่น #gid=0). ถ้าไม่ระบุจะใช้ค่าตั้งต้น.</p>
          </div>

          <div className="rounded-md bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1">
            <p className="font-medium text-slate-700">คอลัมน์ที่รองรับ (แถวแรกเป็นหัวตาราง)</p>
            <p>รหัสพนักงาน → ชื่อผู้ใช้ | ชื่อ - นามสกุล | ตำแหน่ง | แผนก | เบอร์ → รหัสผ่าน | อีเมล</p>
            <p>แถวที่รหัสพนักงานซ้ำกับในระบบหรือซ้ำกันเองในชีทจะถูกข้ามอัตโนมัติ</p>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          {success && (
            <p className="flex items-start gap-1.5 text-sm text-green-700">
              <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              {success}
            </p>
          )}
          <p className="text-xs text-slate-400">
            ชีทต้องแชร์ &quot;anyone with the link can view&quot; หรือ Publish to web แล้วระบบจึงอ่านได้
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>ปิด</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />กำลังบันทึก...</>
            ) : (
              'บันทึกการตั้งค่า'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
