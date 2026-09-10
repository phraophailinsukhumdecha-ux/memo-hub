import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { sendOwnerNotification } from '@/lib/memo-email';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { approverId, approverName, comment } = await request.json();

    // Reject (Cancel) always requires a remark
    if (!comment?.trim()) {
      return NextResponse.json({ error: 'กรุณาระบุเหตุผลในการปฏิเสธ' }, { status: 400 });
    }

    const memoDoc = await getDoc(doc(db, 'memos', id));
    if (!memoDoc.exists()) {
      return NextResponse.json({ error: 'Memo not found' }, { status: 404 });
    }

    const memo = memoDoc.data()!;
    const currentLevel = memo.approvalRoute[memo.currentApprovalIndex];
    const now = new Date();

    const approval = {
      level: currentLevel.level,
      approvalLevel: currentLevel.approvalLevel,
      approverId,
      approverName,
      action: 'reject',
      comment,
      actedAt: now,
    };

    await updateDoc(doc(db, 'memos', id), {
      status: 'rejected',
      currentApprovalIndex: memo.currentApprovalIndex + 1,
      currentApprovalLevel: null,
      approvals: [...(memo.approvals || []), approval],
      closedAt: now,
      updatedAt: now,
    });

    await addDoc(collection(db, 'notifications'), {
      userId: memo.ownerId,
      type: 'rejected',
      memoId: id,
      message: `Memo ของคุณถูกปฏิเสธ: ${memo.title}`,
      isRead: false,
      createdAt: now,
    });

    await addDoc(collection(db, 'eventLogs'), {
      userId: approverId,
      userName: approverName,
      action: 'MEMO_REJECTED',
      details: `ปฏิเสธ Memo: ${memo.title}`,
      timestamp: now,
    });

    // Notify the memo owner by email (fire-and-forget safe: never throws)
    const baseUrl =
      request.headers.get('origin') ||
      `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host') || 'localhost:3000'}`;
    await sendOwnerNotification({
      memoId: id,
      actorId: approverId,
      actorName: approverName,
      action: 'reject',
      remark: comment.trim(),
      baseUrl,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
