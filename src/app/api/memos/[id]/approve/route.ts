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
    const now = new Date();
    const formData = memo.formData || {};

    let approverColKey: string | null = null;
    for (const fieldKey of Object.keys(formData)) {
      const fieldValue = formData[fieldKey];
      if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
        for (const colKey of Object.keys(fieldValue)) {
          if (colKey.startsWith('col_') && colKey !== 'col_0') {
            const col = (fieldValue as Record<string, Record<string, string>>)[colKey];
            if (col?.userId === approverId) {
              approverColKey = colKey;
              break;
            }
          }
        }
      }
    }

    if (!approverColKey) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์อนุมัติ memo นี้' }, { status: 403 });
    }

    const approval = {
      level: 0,
      approvalLevel: approverColKey,
      approverId,
      approverName,
      action: 'approve' as const,
      comment: comment || '',
      actedAt: now,
    };

    const updatedFormData = JSON.parse(JSON.stringify(formData));
    for (const fieldKey of Object.keys(updatedFormData)) {
      const fieldValue = updatedFormData[fieldKey];
      if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
        if (fieldValue[approverColKey]) {
          fieldValue[approverColKey].signed = true;
          fieldValue[approverColKey].date = now.toISOString().split('T')[0];
          fieldValue[approverColKey].time = now.toTimeString().split(' ')[0].substring(0, 5);
        }
      }
    }

    let allApproved = true;
    for (const fieldKey of Object.keys(updatedFormData)) {
      const fieldValue = updatedFormData[fieldKey];
      if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
        for (const colKey of Object.keys(fieldValue)) {
          if (colKey.startsWith('col_') && colKey !== 'col_0') {
            if (!fieldValue[colKey]?.signed && fieldValue[colKey]?.userId) {
              allApproved = false;
              break;
            }
          }
        }
      }
      if (!allApproved) break;
    }

    if (allApproved) {
      await updateDoc(doc(db, 'memos', id), {
        status: 'approved',
        formData: updatedFormData,
        approvals: [...(memo.approvals || []), approval],
        closedAt: now,
        updatedAt: now,
      });

      await addDoc(collection(db, 'notifications'), {
        userId: memo.ownerId,
        type: 'approved',
        memoId: id,
        message: `Memo ของคุณได้รับการอนุมัติครบทุกคนแล้ว: ${memo.title}`,
        isRead: false,
        createdAt: now,
      });
    } else {
      await updateDoc(doc(db, 'memos', id), {
        formData: updatedFormData,
        approvals: [...(memo.approvals || []), approval],
        updatedAt: now,
        waitingAt: memo.waitingAt || now,
      });

      const notifiedUserIds = new Set<string>();
      for (const fieldKey of Object.keys(updatedFormData)) {
        const fieldValue = updatedFormData[fieldKey];
        if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
          for (const colKey of Object.keys(fieldValue)) {
            if (colKey.startsWith('col_') && colKey !== 'col_0') {
              const col = fieldValue[colKey];
              if (col?.userId && !col?.signed && col.userId !== approverId) {
                if (!notifiedUserIds.has(col.userId)) {
                  notifiedUserIds.add(col.userId);
                  await addDoc(collection(db, 'notifications'), {
                    userId: col.userId,
                    type: 'new_memo',
                    memoId: id,
                    message: `มี Memo รอการอนุมัติของคุณ: ${memo.title}`,
                    isRead: false,
                    createdAt: now,
                  });
                }
              }
            }
          }
        }
      }
    }

    await addDoc(collection(db, 'eventLogs'), {
      userId: approverId,
      userName: approverName,
      action: 'MEMO_APPROVED',
      details: `อนุมัติ Memo: ${memo.title}`,
      timestamp: now,
    });

    return NextResponse.json({ success: true, allApproved });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
