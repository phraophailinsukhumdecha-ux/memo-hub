import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, deleteDoc, addDoc, collection, updateDoc } from 'firebase/firestore';
import { logMemoCreated, notifyApprovers } from '@/lib/memo-side-effects';
import { getDeadlineDays } from '@/lib/deadline';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { formData, publish, ownerId } = await request.json();

    const memoDoc = await getDoc(doc(db, 'memos', id));
    if (!memoDoc.exists()) {
      return NextResponse.json({ error: 'ไม่พบ Memo' }, { status: 404 });
    }
    const memo = memoDoc.data()!;
    if (memo.ownerId !== ownerId) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์แก้ไข Memo นี้' }, { status: 403 });
    }
    if (memo.status !== 'draft') {
      return NextResponse.json({ error: 'แก้ไขได้เฉพาะ Memo แบบร่างเท่านั้น' }, { status: 400 });
    }

    const now = new Date();

    if (publish) {
      const deadlineDays = await getDeadlineDays();
      await updateDoc(doc(db, 'memos', id), {
        formData,
        status: 'new',
        deadlineAt: new Date(Date.now() + deadlineDays * 86400000),
        updatedAt: now,
      });
      await logMemoCreated(memo.ownerId, memo.ownerName, memo.title, now);
      await notifyApprovers(formData, id, memo.title, memo.ownerId, now);
    } else {
      await updateDoc(doc(db, 'memos', id), {
        formData,
        updatedAt: now,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');

    const memoDoc = await getDoc(doc(db, 'memos', id));
    if (!memoDoc.exists()) {
      return NextResponse.json({ error: 'Memo not found' }, { status: 404 });
    }

    const memo = memoDoc.data()!;

    // Role check: Only admin can delete any memo.
    // Non-admin can only delete if it's draft or if no approver has taken action yet.
    if (userRole !== 'admin') {
      if (userId && memo.ownerId !== userId) {
        return NextResponse.json({ error: 'ไม่มีสิทธิ์ลบ Memo ของผู้อื่น' }, { status: 403 });
      }

      if (memo.status === 'approved' || memo.status === 'rejected') {
        return NextResponse.json({ error: 'ไม่สามารถลบ Memo ที่อนุมัติแล้วหรือถูกปฏิเสธแล้วได้' }, { status: 403 });
      }

      if (Array.isArray(memo.approvals) && memo.approvals.length > 0) {
        return NextResponse.json({ error: 'ไม่สามารถลบ Memo ที่มีผู้อนุมัติเริ่มลงนามแล้วได้' }, { status: 403 });
      }

      if (memo.formData && typeof memo.formData === 'object') {
        const fd = memo.formData as Record<string, unknown>;
        for (const key of Object.keys(fd)) {
          const val = fd[key];
          if (val && typeof val === 'object' && !Array.isArray(val)) {
            const grid = val as Record<string, { signed?: boolean; action?: string }>;
            for (const colKey of Object.keys(grid)) {
              if (colKey.startsWith('col_') && colKey !== 'col_0') {
                const col = grid[colKey];
                if (col && (col.signed || col.action === 'approve' || col.action === 'reject')) {
                  return NextResponse.json({ error: 'ไม่สามารถลบ Memo ที่มีผู้อนุมัติเริ่มลงนามแล้วได้' }, { status: 403 });
                }
              }
            }
          }
        }
      }
    }

    const now = new Date();

    await addDoc(collection(db, 'eventLogs'), {
      userId: userId || memo.ownerId,
      userName: memo.ownerName,
      action: 'MEMO_DELETED',
      details: `ลบ Memo: ${memo.title} (${memo.memoNumber})`,
      timestamp: now,
    });

    await deleteDoc(doc(db, 'memos', id));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
