import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const memoDoc = await getDoc(doc(db, 'memos', id));
    if (!memoDoc.exists()) {
      return NextResponse.json({ error: 'Memo not found' }, { status: 404 });
    }

    const memo = memoDoc.data()!;
    const now = new Date();

    await updateDoc(doc(db, 'memos', id), {
      status: 'cancel',
      currentApprovalIndex: memo.approvalRoute.length,
      currentApprovalLevel: null,
      closedAt: now,
      updatedAt: now,
    });

    await addDoc(collection(db, 'notifications'), {
      userId: memo.ownerId,
      type: 'cancel',
      memoId: id,
      message: `Memo ของคุณถูกยกเลิก: ${memo.title}`,
      isRead: false,
      createdAt: now,
    });

    await addDoc(collection(db, 'eventLogs'), {
      userId: memo.ownerId,
      userName: memo.ownerName,
      action: 'MEMO_CANCELLED',
      details: `ยกเลิก Memo: ${memo.title}`,
      timestamp: now,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
