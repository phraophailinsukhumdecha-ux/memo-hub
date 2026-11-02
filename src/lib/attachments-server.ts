import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { DriveFolderMapping, GlobalSettings, MemoAttachment } from '@/types';
import { findOrCreateFolder, getRootFolderId, trashFile } from './google-drive';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB per file
export const MAX_FILES_PER_SECTION = 5;
export const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'] as const;

export type AllowedMime = 'application/pdf' | 'image/jpeg' | 'image/png';

/** Inspect the first bytes of a file instead of trusting the client MIME type. */
export function detectMimeType(buffer: Buffer): AllowedMime | null {
  if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'application/pdf';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  return null;
}

export function extensionForMime(mime: AllowedMime): string {
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'image/png') return 'png';
  return 'jpg';
}

/** Drive rejects these characters and very long names. */
export function sanitizeFileName(name: string): string {
  const cleaned = (name || 'file')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  const base = cleaned || 'file';
  if (base.length <= 120) return base;
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return base.slice(0, 120);
  const ext = base.slice(dot);
  return `${base.slice(0, Math.max(1, 120 - ext.length))}${ext}`;
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export interface AttachmentRuntimeSettings {
  enabled: boolean;
  maxFiles: number;
  maxSizeMB: number;
  folders: DriveFolderMapping[];
}

export async function getAttachmentRuntimeSettings(): Promise<AttachmentRuntimeSettings> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'global'));
    const data = (snap.exists() ? snap.data() : {}) as Partial<GlobalSettings>;
    return {
      enabled: data.driveAttachment?.enabled !== false,
      maxFiles: data.driveAttachment?.maxFiles || MAX_FILES_PER_SECTION,
      maxSizeMB: data.driveAttachment?.maxSizeMB || 10,
      folders: Array.isArray(data.driveFolders) ? data.driveFolders : [],
    };
  } catch {
    return { enabled: true, maxFiles: MAX_FILES_PER_SECTION, maxSizeMB: 10, folders: [] };
  }
}

/** Department folder -> YYYY-MM subfolder. Falls back to the shared drive root. */
export async function resolveUploadFolder(department: string | undefined, folders: DriveFolderMapping[]): Promise<string> {
  const root = await getRootFolderId();
  const dept = (department || '').trim();
  const mapping = dept ? folders.find((f) => f.department === dept) : undefined;
  const parent = mapping?.driveFolderId || root;

  const now = new Date();
  const monthFolder = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  try {
    return await findOrCreateFolder(monthFolder, parent);
  } catch {
    // If creating the month folder fails, still try uploading next to the parent.
    return parent;
  }
}

interface AttachmentLike {
  fileId?: unknown;
  name?: unknown;
  mimeType?: unknown;
  size?: unknown;
}

function looksLikeAttachment(value: unknown): value is MemoAttachment {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as AttachmentLike;
  return (
    typeof item.fileId === 'string' &&
    typeof item.name === 'string' &&
    typeof item.mimeType === 'string' &&
    ALLOWED_EXTENSIONS.some((ext) => (item.mimeType as string).includes(ext) || (item.name as string).toLowerCase().endsWith(`.${ext}`))
  );
}

/** Pull every attachment out of a memo's formData (used for delete / duplicate). */
export function collectAttachments(formData: unknown): MemoAttachment[] {
  if (!formData || typeof formData !== 'object') return [];
  const found: MemoAttachment[] = [];
  for (const value of Object.values(formData as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (looksLikeAttachment(item)) found.push(item);
      }
    }
  }
  return found;
}

/** Move all files of a memo to the Drive trash. Never throws. */
export async function trashMemoAttachments(formData: unknown): Promise<void> {
  const files = collectAttachments(formData);
  await Promise.all(
    files.map((file) =>
      trashFile(file.fileId).catch(() => {
        /* ignore individual failures */
      })
    )
  );
}
