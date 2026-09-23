'use client';

import React, { useEffect, useState } from 'react';
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

interface ImportSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  subtitle?: string;
  config?: SheetImportConfig;
  existing?: string[];
  onConfigSave: (cfg: SheetImportConfig) => Promise<void>;
  onImport: (values: string[]) => void | Promise<void>;
}

function extractSheetId(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  const m = t.match(/\/spreadsheets\/d\/(?:e\/)?([a-zA-Z0-9_-]+)/);
  if (m) return t.includes('/d/e/') ? `e/${m[1]}` : m[1];
  if (/^e\/[a-zA-Z0-9_-]+$/.test(t) || /^[a-zA-Z0-9_-]+$/.test(t)) return t;
  return null;
}

function colLetterToIndex(letters: string): number {
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function parseColumnRange(range: string): number[] | null {
  const r = range.trim().toUpperCase().replace(/\s+/g, '');
  if (!r) return [0];
  if (/^[A-Z]+$/.test(r)) return [colLetterToIndex(r)];
  const m = r.match(/^([A-Z]+)[-:]([A-Z]+)$/);
  if (m) {
    const a = colLetterToIndex(m[1]);
    const b = colLetterToIndex(m[2]);
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    if (hi - lo > 50) return null;
    return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  }
  return null;
}

function extractValues(rows: string[][], cols: number[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of rows) {
    for (const ci of cols) {
      const v = (row[ci] || '').trim();
      if (v && !seen.has(v)) {
        seen.add(v);
        out.push(v);
      }
    }
  }
  return out;
}

export function ImportSheetDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  config,
  existing = [],
  onConfigSave,
  onImport,
}: ImportSheetDialogProps) {
  const [sheetId, setSheetId] = useState('');
  const [gid, setGid] = useState('');
  const [columnRange, setColumnRange] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (open) {
      setSheetId(config?.sheetId || '');
      setGid(config?.gid || '');
      setColumnRange(config?.columnRange || '');
      setError('');
      setSuccess('');
      setLoading(false);
    }
  }, [open, config]);

  const handleOpenChange = (o: boolean) => {
    onOpenChange(o);
    if (!o) {
      setError('');
      setSuccess('');
      setLoading(false);
    }
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
    if (!/^\d*$/.test(safeGid)) {
      setError('Sheet GID ต้องเป็นตัวเลข');
      return;
    }
    const range = columnRange.trim() || 'A';
    const cols = parseColumnRange(range);
    if (!cols) {
      setError('รูปแบบช่องคอลัมน์ไม่ถูกต้อง (เช่น A หรือ A-I)');
      return;
    }

    setLoading(true);
    try {
      const cfg: SheetImportConfig = { sheetId: id, gid: safeGid || '0', columnRange: range };
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

      const values = extractValues(json.rows || [], cols);
      if (values.length === 0) {
        setError('ไม่พบข้อมูลในคอลัมน์ที่ระบุ');
        return;
      }

      const existingSet = new Set(existing);
      const newValues = values.filter((v) => !existingSet.has(v));
      const dup = values.length - newValues.length;

      if (newValues.length === 0) {
        setSuccess(`บันทึกการตั้งค่าแล้ว — ไม่มีรายการใหม่ (ซ้ำ ${dup} รายการ)`);
        return;
      }

      if (!confirm(`พบข้อมูล ${values.length} รายการ (ใหม่ ${newValues.length} / ซ้ำ ${dup})\nต้องการนำเข้าใช่หรือไม่?`)) {
        setSuccess('บันทึกการตั้งค่าแล้ว ยังไม่นำเข้าข้อมูล');
        return;
      }

      await onImport(newValues);
      setSuccess(`นำเข้าสำเร็จ ${newValues.length} รายการ (ข้าม ${dup} รายการซ้ำ)`);
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
            {subtitle || 'อัปเดตรายการข้อมูลโดยตรงจาก Google Sheet ของคุณ'}
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

          <div className="grid gap-2">
            <Label>ช่องคอลัมน์</Label>
            <Input
              value={columnRange}
              onChange={(e) => { setColumnRange(e.target.value); setError(''); setSuccess(''); }}
              placeholder="เช่น A-I"
              disabled={loading}
            />
            <p className="text-xs text-slate-500">ระบุคอลัมน์ที่ต้องการ (เช่น A หรือ A-I). ถ้าไม่ระบุจะใช้คอลัมน์ A.</p>
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
