import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, deleteDoc, addDoc, collection, updateDoc } from 'firebase/firestore';
import { logMemoCreated, notifyApprovers } from '@/lib/memo-side-effects';

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
      await updateDoc(doc(db, 'memos', id), {
        formData,
        status: 'new',
        deadlineAt: new Date(Date.now() + 7 * 86400000),
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

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const memoDoc = await getDoc(doc(db, 'memos', id));
    if (!memoDoc.exists()) {
      return NextResponse.json({ error: 'Memo not found' }, { status: 404 });
    }

    const memo = memoDoc.data()!;
    const now = new Date();

    await addDoc(collection(db, 'eventLogs'), {
      userId: memo.ownerId,
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
