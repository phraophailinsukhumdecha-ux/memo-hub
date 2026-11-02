import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { sendOwnerNotification, sendApproverNotifications } from '@/lib/memo-email';
import { getNextApprovalColumn } from '@/lib/approval-flow';
import { formatActionDate, formatActionTime } from '@/lib/datetime';
import { buildApprovalLog } from '@/lib/event-logs';

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
    const now = new Date();

    if (memo.status !== 'new' && memo.status !== 'waiting') {
      return NextResponse.json({ error: 'Memo นี้ถูกปิดการอนุมัติแล้ว (สถานะ: ' + memo.status + ')' }, { status: 400 });
    }
    const deadline = memo.deadlineAt?.toDate ? memo.deadlineAt.toDate() : memo.deadlineAt ? new Date(memo.deadlineAt) : null;
    if (deadline && deadline.getTime() < now.getTime()) {
      return NextResponse.json({ error: 'เลยกำหนดเวลาอนุมัติของ Memo นี้แล้ว' }, { status: 400 });
    }

    const currentLevel = memo.approvalRoute[memo.currentApprovalIndex];
    const formData = memo.formData || {};

    // Find the approver's column in the approval grid and mark as signed
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
        if (approverColKey) break;
      }
    }

    if (!approverColKey) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ปฏิเสธ memo นี้' }, { status: 403 });
    }

    // Sequential order guard: a later approver cannot reject before the
    // earlier checkers/approvers in the chain have acted.
    const nextColumn = getNextApprovalColumn(formData);
    if (!nextColumn || nextColumn.key !== approverColKey) {
      return NextResponse.json(
        { error: 'ยังไม่ถึงลำดับของคุณ กรุณารอผู้ตรวจสอบ/ผู้อนุมัติลำดับก่อนหน้าดำเนินการก่อน' },
        { status: 403 }
      );
    }

    const updatedFormData = JSON.parse(JSON.stringify(formData));
    if (approverColKey) {      for (const fieldKey of Object.keys(updatedFormData)) {
        const fieldValue = updatedFormData[fieldKey];
        if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
          if (fieldValue[approverColKey]) {
            fieldValue[approverColKey].signed = false;
            fieldValue[approverColKey].action = 'reject';
            fieldValue[approverColKey].date = formatActionDate(now);
            fieldValue[approverColKey].time = formatActionTime(now);
          }
        }
      }
    }

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
      formData: updatedFormData,
      currentApprovalIndex: memo.currentApprovalIndex + 1,
      currentApprovalLevel: null,
      approvals: [...(memo.approvals || []), approval],
      rejectionComment: comment.trim(),
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
      ...buildApprovalLog({
        memoId: id,
        memoNumber: memo.memoNumber as string | undefined,
        memoTitle: memo.title as string,
        decision: 'reject',
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
      action: 'reject',
      remark: comment.trim(),
      baseUrl,
    });

    await sendApproverNotifications({
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
