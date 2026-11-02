'use client';

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { AttachmentSectionConfig, MemoAttachment, User } from '@/types';
import { getAttachmentDriveUrl } from '@/lib/attachment-links';
import { AlertCircle, FileText, Loader2, Paperclip, Trash2, Upload } from 'lucide-react';

interface AttachmentSectionProps {
  config?: AttachmentSectionConfig;
  value?: MemoAttachment[];
  onChange?: (value: MemoAttachment[]) => void;
  readonly?: boolean;
  ownerUser?: User | null;
  /** Needed to authorize downloads of files that belong to a saved memo. */
  memoId?: string;
  userId?: string;
  userRole?: string;
}

interface PendingFile {
  file: File;
  name: string;
  mimeType: string;
  size: number;
}

function formatSize(bytes: number): string {
  if (!bytes || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function AttachmentSection({
  config,
  value,
  onChange,
  readonly,
  ownerUser,
  memoId,
  userId,
  userRole,
}: AttachmentSectionProps) {
  const files = Array.isArray(value) ? value : [];
  const maxFiles = config?.maxFiles || 5;
  const maxSizeMB = config?.maxSizeMB || 10;
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const totalCount = files.length + pendingFiles.length;
  const canAdd = totalCount < maxFiles;

  const handleFilesSelected = (selected: FileList | null) => {
    if (!selected) return;
    setError('');
    const available = Math.max(0, maxFiles - files.length - pendingFiles.length);
    const candidates = Array.from(selected).slice(0, available);
    const accepted: PendingFile[] = [];
    let rejectedReason = '';
    for (const candidate of candidates) {
      if (candidate.size > maxSizeMB * 1024 * 1024) {
        rejectedReason = `"${candidate.name}" ใหญ่เกิน ${maxSizeMB} MB`;
        break;
      }
      accepted.push({
        file: candidate,
        name: candidate.name,
        mimeType: candidate.type,
        size: candidate.size,
      });
    }
    if (candidates.length > accepted.length) {
      rejectedReason = `สามารถเลือกได้ไม่เกิน ${maxFiles} ไฟล์`;
    }
    if (accepted.length > 0) {
      setPendingFiles((prev) => [...prev, ...accepted]);
    }
    if (rejectedReason) {
      setError(rejectedReason);
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const confirmUpload = async () => {
    if (pendingFiles.length === 0 || !onChange) return;
    setUploading(true);
    setError('');
    const added: MemoAttachment[] = [];
    const failed: string[] = [];

    for (const pending of pendingFiles) {
      const form = new FormData();
      form.append('file', pending.file);
      form.append('department', ownerUser?.department || '');
      form.append('uploadedBy', ownerUser?.displayName || '');
      const res = await fetch('/api/attachments/upload', { method: 'POST', body: form });
      const data = (await res.json()) as { file?: MemoAttachment; error?: string };
      if (res.ok && data.file) {
        added.push(data.file);
      } else {
        failed.push(pending.name);
      }
    }

    if (added.length > 0) {
      onChange([...files, ...added]);
    }
    if (failed.length > 0) {
      setError(`อัปโหลดไม่สำเร็จ: ${failed.join(', ')}`);
    }
    setPendingFiles([]);
    setUploading(false);
  };

  const removePending = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const remove = async (file: MemoAttachment) => {
    if (!onChange) return;
    // Remove from the memo + ask the server to move the Drive file to trash.
    if (memoId) {
      const params = new URLSearchParams({ memoId });
      if (userId) params.set('userId', userId);
      if (userRole) params.set('role', userRole);
      try {
        const res = await fetch(`/api/attachments/${encodeURIComponent(file.fileId)}?${params.toString()}`, { method: 'DELETE' });
        if (!res.ok) {
          // Fall through to removing the reference anyway.
        }
      } catch {
        // Ignore network failures — still remove from the memo list.
      }
    }
    onChange(files.filter((f) => f.fileId !== file.fileId));
  };

  const downloadHref = (file: MemoAttachment) => getAttachmentDriveUrl(file);

  if (readonly) {
    if (files.length === 0) return null;
    return (
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">ไฟล์แนบ ({files.length})</p>
        <ul className="space-y-1">
          {files.map((file) => {
            const href = downloadHref(file);
            return (
              <li key={file.fileId} className="flex items-center gap-2 text-sm">
                <Paperclip className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                {href ? (
                  <a href={href} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate">
                    {file.name}
                  </a>
                ) : (
                  <span className="truncate text-slate-700">{file.name}</span>
                )}
                <span className="text-xs text-slate-400 shrink-0">{formatSize(file.size)}</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-slate-700">
          ไฟล์แนบ
          {config?.required && <span className="text-red-500 ml-1">*</span>}
          <span className="ml-2 text-xs font-normal text-slate-500">
            {totalCount}/{maxFiles} ไฟล์ • PDF, JPG, PNG • ไม่เกิน {maxSizeMB} MB/ไฟล์
          </span>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="hidden"
          onChange={(e) => handleFilesSelected(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canAdd || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
          เลือกไฟล์
        </Button>
      </div>

      {config?.helperText && <p className="text-xs text-slate-500">{config.helperText}</p>}

      {pendingFiles.length > 0 && (
        <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 space-y-2">
          <p className="text-xs font-semibold text-slate-700">ไฟล์ที่รออัปโหลด ({pendingFiles.length})</p>
          <ul className="space-y-1">
            {pendingFiles.map((pending, index) => (
              <li key={`${index}-${pending.name}`} className="flex items-center gap-2 text-sm">
                <Paperclip className="h-4 w-4 text-slate-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-slate-700">{pending.name}</span>
                  <span className="text-xs text-slate-400">{formatSize(pending.size)}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-600"
                  onClick={() => removePending(index)}
                  title="ยกเลิก"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={confirmUpload} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
              {uploading ? 'กำลังอัปโหลด...' : 'ยืนยันอัปโหลด'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setPendingFiles([])} disabled={uploading}>
              ยกเลิกทั้งหมด
            </Button>
          </div>
        </div>
      )}

      {files.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          <FileText className="mx-auto mb-2 h-6 w-6 text-slate-400" />
          ยังไม่มีไฟล์แนบ
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {files.map((file) => {
            const href = downloadHref(file);
            return (
              <li key={file.fileId} className="flex items-center gap-2 px-3 py-2 text-sm">
                <Paperclip className="h-4 w-4 text-slate-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  {href ? (
                    <a href={href} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate block">
                      {file.name}
                    </a>
                  ) : (
                    <span className="truncate block text-slate-700">{file.name}</span>
                  )}
                  <span className="text-xs text-slate-400">{formatSize(file.size)}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => remove(file)}
                  title="เอาไฟล์ออก"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <p className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}
