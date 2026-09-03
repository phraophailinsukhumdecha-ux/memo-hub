import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { approverId, approverName, comment } = await request.json();

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
      action: 'approve',
      comment: comment || '',
      actedAt: now,
    };

    const nextIndex = memo.currentApprovalIndex + 1;
    const hasNextLevel = nextIndex < memo.approvalRoute.length;

    if (hasNextLevel) {
      const nextLevel = memo.approvalRoute[nextIndex];
      await updateDoc(doc(db, 'memos', id), {
        currentApprovalIndex: nextIndex,
        currentApprovalLevel: nextLevel.approvalLevel,
        approvals: [...(memo.approvals || []), approval],
        updatedAt: now,
        waitingAt: memo.waitingAt || now,
      });

      const formData = memo.formData || {};
      const nextColIndex = nextIndex + 1;
      const notifiedUserIds = new Set<string>();

      for (const fieldKey of Object.keys(formData)) {
        const fieldValue = formData[fieldKey];
        if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
          for (const colKey of Object.keys(fieldValue)) {
            if (colKey.startsWith('col_')) {
              const colIdx = parseInt(colKey.split('_')[1]);
              if (colIdx >= nextColIndex && (fieldValue as Record<string, Record<string, string>>)[colKey]?.userId) {
                const userId = (fieldValue as Record<string, Record<string, string>>)[colKey].userId;
                if (!notifiedUserIds.has(userId)) {
                  notifiedUserIds.add(userId);
                  await addDoc(collection(db, 'notifications'), {
                    userId,
                    type: 'new_memo',
                    memoId: id,
                    message: `มี Memo รอการอนุมัติ: ${memo.title}`,
                    isRead: false,
                    createdAt: now,
                  });
                }
              }
            }
          }
        }
      }
    } else {
      await updateDoc(doc(db, 'memos', id), {
        status: 'approved',
        currentApprovalIndex: nextIndex,
        currentApprovalLevel: null,
        approvals: [...(memo.approvals || []), approval],
        closedAt: now,
        updatedAt: now,
      });

      await addDoc(collection(db, 'notifications'), {
        userId: memo.ownerId,
        type: 'approved',
        memoId: id,
        message: `Memo ของคุณได้รับการอนุมัติแล้ว: ${memo.title}`,
        isRead: false,
        createdAt: now,
      });
    }

    await addDoc(collection(db, 'eventLogs'), {
      userId: approverId,
      userName: approverName,
      action: 'MEMO_APPROVED',
      details: `อนุมัติ Memo: ${memo.title}`,
      timestamp: now,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
