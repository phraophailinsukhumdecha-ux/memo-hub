import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, deleteDoc, addDoc, collection } from 'firebase/firestore';

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
