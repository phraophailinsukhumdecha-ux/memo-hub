import { NextRequest, NextResponse } from 'next/server';
import type { MemoAttachment } from '@/types';
import { copyFile } from '@/lib/google-drive';
import { getAttachmentRuntimeSettings, resolveUploadFolder } from '@/lib/attachments-server';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Duplicate attachments for the "Dup" action: copies each Drive file into the
 * current user's department folder so both memos own their own files.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      files?: MemoAttachment[];
      department?: string;
      uploadedBy?: string;
    };
    const files = Array.isArray(body.files) ? body.files : [];
    if (files.length === 0) {
      return NextResponse.json({ files: [] });
    }

    const settings = await getAttachmentRuntimeSettings();
    if (!settings.enabled) {
      return NextResponse.json({ error: 'ระบบไฟล์แนบถูกปิดใช้งาน' }, { status: 403 });
    }

    const folderId = await resolveUploadFolder(body.department, settings.folders);
    const now = new Date().toISOString();

    const copied: MemoAttachment[] = [];
    for (const file of files.slice(0, settings.maxFiles)) {
      try {
        const result = await copyFile(file.fileId, file.name, folderId);
        copied.push({
          fileId: result.fileId,
          name: result.name,
          mimeType: result.mimeType,
          size: result.size,
          folderId: result.folderId,
          webViewLink: result.webViewLink,
          uploadedAt: now,
          uploadedBy: body.uploadedBy || undefined,
        });
      } catch (error) {
        console.warn(`Copy attachment ${file.fileId} failed:`, error);
      }
    }

    return NextResponse.json({ files: copied });
  } catch (error) {
    console.error('Attachment copy failed:', error);
    return NextResponse.json({ error: 'คัดลอกไฟล์แนบไม่สำเร็จ' }, { status: 500 });
  }
}
