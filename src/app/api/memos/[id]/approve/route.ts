import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, addDoc, collection, getDocs } from 'firebase/firestore';
import { sendOwnerNotification, sendApproverNotifications } from '@/lib/memo-email';
import { getNextApprovalColumn } from '@/lib/approval-flow';
import { formatActionDate, formatActionTime } from '@/lib/datetime';
import { buildApprovalLog } from '@/lib/event-logs';

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

    if (memo.status !== 'new' && memo.status !== 'waiting') {
      return NextResponse.json({ error: 'Memo นี้ถูกปิดการอนุมัติแล้ว (สถานะ: ' + memo.status + ')' }, { status: 400 });
    }
    const deadline = memo.deadlineAt?.toDate ? memo.deadlineAt.toDate() : memo.deadlineAt ? new Date(memo.deadlineAt) : null;
    if (deadline && deadline.getTime() < now.getTime()) {
      return NextResponse.json({ error: 'เลยกำหนดเวลาอนุมัติของ Memo นี้แล้ว' }, { status: 400 });
    }

    let approverColKey: string | null = null;
    for (const fieldKey of Object.keys(formData)) {
      const fieldValue = formData[fieldKey];
      if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
        for (const colKey of Object.keys(fieldValue)) {
          if (colKey.startsWith('col_') && colKey !== 'col_0') {
            const col = (fieldValue as Record<string, Record<string, string>>)[colKey];
            if (col?.userId === approverId || col?.name === approverName) {
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

    // Sequential order guard: the memo only moves forward when the first
    // unsigned column in the chain acts. Later approvers must wait.
    const nextColumn = getNextApprovalColumn(formData);
    if (!nextColumn || nextColumn.key !== approverColKey) {
      return NextResponse.json(
        { error: 'ยังไม่ถึงลำดับของคุณ กรุณารอผู้ตรวจสอบ/ผู้อนุมัติลำดับก่อนหน้าดำเนินการก่อน' },
        { status: 403 }
      );
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
          fieldValue[approverColKey].action = 'approve';
          fieldValue[approverColKey].date = formatActionDate(now);
          fieldValue[approverColKey].time = formatActionTime(now);
        }
      }
    }

    let allApproved = true;
    for (const fieldKey of Object.keys(updatedFormData)) {
      const fieldValue = updatedFormData[fieldKey];
      if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
        for (const colKey of Object.keys(fieldValue)) {
          if (colKey.startsWith('col_') && colKey !== 'col_0') {
            const col = fieldValue[colKey];
            if ((col?.userId || col?.name) && !col?.signed) {
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
        status: 'waiting',
        formData: updatedFormData,
        approvals: [...(memo.approvals || []), approval],
        updatedAt: now,
        waitingAt: memo.waitingAt || now,
      });

      // Sequential flow: only the NEXT approver in the chain gets an in-app
      // notification. Later approvers must not see the memo before their turn.
      const nextAfter = getNextApprovalColumn(updatedFormData);
      let nextUserId: string | undefined;
      if (nextAfter?.userId) {
        nextUserId = nextAfter.userId;
      } else if (nextAfter?.name) {
        // Legacy rows only store the approver name — resolve it to a user id.
        const usersSnapshot = await getDocs(collection(db, 'users'));
        nextUserId = usersSnapshot.docs.find(
          (d) => (d.data() as Record<string, unknown>).displayName === nextAfter.name
        )?.id;
      }
      if (nextUserId && nextUserId !== approverId) {
        await addDoc(collection(db, 'notifications'), {
          userId: nextUserId,
          type: 'new_memo',
          memoId: id,
          message: `มี Memo รอการอนุมัติของคุณ: ${memo.title}`,
          isRead: false,
          createdAt: now,
        });
      }
    }

    await addDoc(collection(db, 'eventLogs'), {
      userId: approverId,
      userName: approverName,
      ...buildApprovalLog({
        memoId: id,
        memoNumber: memo.memoNumber as string | undefined,
        memoTitle: memo.title as string,
        decision: 'approve',
        channel: 'web',
        comment,
      }),
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
      action: 'approve',
      remark: comment?.trim() || undefined,
      baseUrl,
    });

    await sendApproverNotifications({
      memoId: id,
      actorId: approverId,
      actorName: approverName,
      action: 'approve',
      remark: comment?.trim() || undefined,
      baseUrl,
    });

    return NextResponse.json({ success: true, allApproved });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
