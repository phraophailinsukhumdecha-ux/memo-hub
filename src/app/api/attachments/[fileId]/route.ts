import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Memo } from '@/types';
import { downloadFile, trashFile } from '@/lib/google-drive';
import { collectAttachments } from '@/lib/attachments-server';
import { logApiError } from '@/lib/logger';

export const runtime = 'nodejs';

function contentDisposition(name: string): string {
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '');
  return `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const { searchParams } = new URL(request.url);
    const memoId = searchParams.get('memoId');
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');

    if (role !== 'admin') {
      if (!memoId) {
        return NextResponse.json({ error: 'ไม่ระบุ Memo ที่ต้องการเข้าถึง' }, { status: 400 });
      }
      const memoSnap = await getDoc(doc(db, 'memos', memoId));
      if (!memoSnap.exists()) {
        return NextResponse.json({ error: 'ไม่พบ Memo' }, { status: 404 });
      }
      const memo = { id: memoSnap.id, ...memoSnap.data() } as Memo;
      const isOwner = Boolean(userId) && memo.ownerId === userId;
      const isApprover = Boolean(userId) && Array.isArray(memo.approvals) && memo.approvals.some((a) => a.approverId === userId);
      if (!isOwner && !isApprover) {
        return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึงไฟล์นี้' }, { status: 403 });
      }
      const owns = collectAttachments(memo.formData).some((f) => f.fileId === fileId);
      if (!owns) {
        return NextResponse.json({ error: 'ไม่พบไฟล์ใน Memo นี้' }, { status: 404 });
      }
    }

    const upstream = await downloadFile(fileId);
    const headers = new Headers();
    headers.set('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
    const disposition = upstream.headers.get('content-disposition');
    if (disposition && disposition.includes('filename')) {
      headers.set('Content-Disposition', disposition);
    } else {
      headers.set('Content-Disposition', contentDisposition(fileId));
    }
    headers.set('Cache-Control', 'private, max-age=300');

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (error) {
    console.error('Attachment download failed:', error);
    await logApiError('/api/attachments/[fileId] GET', error);
    return NextResponse.json({ error: 'ดาวน์โหลดไฟล์ไม่สำเร็จ' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const { searchParams } = new URL(request.url);
    const memoId = searchParams.get('memoId');
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');

    if (role !== 'admin') {
      if (!memoId) {
        return NextResponse.json({ error: 'ไม่ระบุ Memo ที่ต้องการเข้าถึง' }, { status: 400 });
      }
      const memoSnap = await getDoc(doc(db, 'memos', memoId));
      if (!memoSnap.exists()) {
        return NextResponse.json({ error: 'ไม่พบ Memo' }, { status: 404 });
      }
      const memo = { id: memoSnap.id, ...memoSnap.data() } as Memo;
      const isOwner = Boolean(userId) && memo.ownerId === userId;
      const isApprover = Boolean(userId) && Array.isArray(memo.approvals) && memo.approvals.some((a) => a.approverId === userId);
      if (!isOwner && !isApprover) {
        return NextResponse.json({ error: 'ไม่มีสิทธิ์ลบไฟล์นี้' }, { status: 403 });
      }
    }

    const ok = await trashFile(fileId);
    if (!ok) {
      return NextResponse.json({ error: 'ไม่สามารถลบไฟล์จาก Drive ได้' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Attachment delete failed:', error);
    await logApiError('/api/attachments/[fileId] DELETE', error);
    return NextResponse.json({ error: 'ลบไฟล์ไม่สำเร็จ' }, { status: 500 });
  }
}
