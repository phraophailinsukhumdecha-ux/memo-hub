import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, deleteDoc, addDoc, collection } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { memoIds } = await request.json() as { memoIds: string[] };

    if (!memoIds || !Array.isArray(memoIds) || memoIds.length === 0) {
      return NextResponse.json({ error: 'กรุณาระบุ memo IDs' }, { status: 400 });
    }

    const now = new Date();
    let deleted = 0;
    let failed = 0;

    for (const id of memoIds) {
      try {
        const memoDoc = await getDoc(doc(db, 'memos', id));
        if (!memoDoc.exists()) {
          failed++;
          continue;
        }

        const memo = memoDoc.data()!;

        await addDoc(collection(db, 'eventLogs'), {
          userId: memo.ownerId,
          userName: memo.ownerName,
          action: 'MEMO_DELETED',
          details: `ลบ Memo: ${memo.title} (${memo.memoNumber})`,
          timestamp: now,
        });

        await deleteDoc(doc(db, 'memos', id));
        deleted++;
      } catch {
        failed++;
      }
    }

    return NextResponse.json({ success: true, deleted, failed, total: memoIds.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
