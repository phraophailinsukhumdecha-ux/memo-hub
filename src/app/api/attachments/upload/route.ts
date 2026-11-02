import { NextRequest, NextResponse } from 'next/server';
import type { MemoAttachment } from '@/types';
import { DriveConfigError, uploadFile } from '@/lib/google-drive';
import {
  detectMimeType,
  extensionForMime,
  getAttachmentRuntimeSettings,
  resolveUploadFolder,
  sanitizeFileName,
} from '@/lib/attachments-server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    const department = String(form.get('department') || '');
    const uploadedBy = String(form.get('uploadedBy') || '');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'ไม่พบไฟล์ที่อัปโหลด' }, { status: 400 });
    }

    const runtimeSettings = await getAttachmentRuntimeSettings();
    if (!runtimeSettings.enabled) {
      return NextResponse.json({ error: 'ระบบไฟล์แนบถูกปิดใช้งาน' }, { status: 403 });
    }

    const maxBytes = runtimeSettings.maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `ไฟล์ใหญ่เกิน ${runtimeSettings.maxSizeMB} MB` },
        { status: 413 }
      );
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'ไฟล์ว่างเปล่า' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = detectMimeType(buffer);
    if (!mimeType) {
      return NextResponse.json(
        { error: 'รองรับเฉพาะไฟล์ PDF, JPG, JPEG และ PNG เท่านั้น' },
        { status: 415 }
      );
    }

    // Force the extension to match the real file content.
    const originalName = file.name || `file.${extensionForMime(mimeType)}`;
    const dot = originalName.lastIndexOf('.');
    const baseName = dot > 0 ? originalName.slice(0, dot) : originalName;
    const name = sanitizeFileName(`${baseName}.${extensionForMime(mimeType)}`);

    const folderId = await resolveUploadFolder(department, runtimeSettings.folders);
    const uploaded = await uploadFile(buffer, name, mimeType, folderId);

    const attachment: MemoAttachment = {
      fileId: uploaded.fileId,
      name: uploaded.name,
      mimeType: uploaded.mimeType,
      size: uploaded.size,
      folderId: uploaded.folderId,
      webViewLink: uploaded.webViewLink,
      uploadedAt: new Date().toISOString(),
      uploadedBy: uploadedBy || undefined,
    };

    return NextResponse.json({ file: attachment });
  } catch (error) {
    if (error instanceof DriveConfigError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.error('Attachment upload failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'อัปโหลดไฟล์ไม่สำเร็จ' },
      { status: 500 }
    );
  }
}
