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
import { Loader2, FileSpreadsheet, Download } from 'lucide-react';

interface SheetData {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

interface ImportSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  existing?: string[];
  onImport: (values: string[]) => void | Promise<void>;
}

export function ImportSheetDialog({ open, onOpenChange, title, existing = [], onImport }: ImportSheetDialogProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<SheetData | null>(null);
  const [colIndex, setColIndex] = useState(0);

  const reset = () => {
    setUrl('');
    setLoading(false);
    setImporting(false);
    setError('');
    setData(null);
    setColIndex(0);
  };

  const handleOpenChange = (o: boolean) => {
    onOpenChange(o);
    if (!o) reset();
  };

  const handleFetch = async () => {
    if (!url.trim() || loading) return;
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await fetch('/api/import-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.message || 'ดึงข้อมูลไม่สำเร็จ');
        return;
      }
      setData({ headers: json.headers, rows: json.rows, totalRows: json.totalRows });
      setColIndex(0);
    } catch {
      setError('ดึงข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const getColumnValues = (): string[] => {
    if (!data) return [];
    const seen = new Set<string>();
    const values: string[] = [];
    for (const row of data.rows) {
      const raw = (row[colIndex] || '').trim();
      if (!raw || seen.has(raw)) continue;
      seen.add(raw);
      values.push(raw);
    }
    return values;
  };

  const columnValues = data ? getColumnValues() : [];
  const existingSet = new Set(existing);
  const newValues = columnValues.filter((v) => !existingSet.has(v));
  const dupCount = columnValues.length - newValues.length;

  const handleImport = async () => {
    if (newValues.length === 0 || importing) return;
    setImporting(true);
    try {
      await onImport(newValues);
      handleOpenChange(false);
    } finally {
      setImporting(false);
    }
  };

  const previewRows = data ? data.rows.slice(0, 8) : [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            {title || 'นำเข้าจาก Google Sheet'}
          </DialogTitle>
          <DialogDescription>
            วาง URL ของ Google Sheet (ต้อง Publish to web หรือแชร์ &quot;anyone with the link can view&quot; แล้ว)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>URL ของชีท</Label>
            <div className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => { setUrl(e.target.value); setError(''); }}
                placeholder="https://docs.google.com/spreadsheets/..."
                disabled={loading || importing}
              />
              <Button variant="outline" onClick={handleFetch} disabled={!url.trim() || loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </Button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          {data && (
            <>
              <div className="grid gap-2">
                <Label>คอลัมน์ที่จะนำเข้า</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                  value={colIndex}
                  onChange={(e) => setColIndex(Number(e.target.value))}
                  disabled={importing}
                >
                  {data.headers.map((h, i) => (
                    <option key={i} value={i}>{h || `คอลัมน์ ${i + 1}`}</option>
                  ))}
                </select>
              </div>

              <div className="rounded-md border">
                <div className="max-h-[240px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-600 border-b">
                          {data.headers[colIndex] || `คอลัมน์ ${colIndex + 1}`}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, ri) => (
                        <tr key={ri} className={ri % 2 ? 'bg-slate-50/50' : ''}>
                          <td className="px-3 py-1.5 border-b last:border-b-0 text-slate-800">
                            {(row[colIndex] || '').trim() || '—'}
                          </td>
                        </tr>
                      ))}
                      {previewRows.length === 0 && (
                        <tr><td className="px-3 py-3 text-center text-slate-500">ไม่มีข้อมูล</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                <span>ทั้งหมด: <strong>{columnValues.length}</strong></span>
                <span>ใหม่: <strong className="text-green-700">{newValues.length}</strong></span>
                <span>ซ้ำ/มีแล้ว: <strong className="text-slate-500">{dupCount}</strong></span>
                {data.totalRows > previewRows.length && (
                  <span className="text-slate-400">แสดงตัวอย่าง {previewRows.length} จาก {data.totalRows} แถว</span>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={importing}>ยกเลิก</Button>
          <Button onClick={handleImport} disabled={!data || newValues.length === 0 || importing}>
            {importing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />กำลังนำเข้า...</>
            ) : (
              <>นำเข้า {newValues.length} รายการ</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
