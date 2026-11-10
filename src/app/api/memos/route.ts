import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { generateMemoId } from '@/lib/memo-id';
import { getDeadlineDays } from '@/lib/deadline';
import { logMemoCreated, notifyApprovers } from '@/lib/memo-side-effects';
import { logApiError } from '@/lib/logger';
import { isCheckerColumn } from '@/lib/approval-flow';

export async function POST(request: NextRequest) {
  try {
    const { templateId, title, formData, ownerId, ownerName, department, status } = await request.json();
    const isDraft = status === 'draft';

    const templateDoc = await getDoc(doc(db, 'memoTemplates', templateId));
    if (!templateDoc.exists()) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    const template = templateDoc.data()!;

    // The creator may act as a checker, but must never be an approver on their
    // own memo (otherwise the memo could never be approved).
    const gridField = ((template.fields || []) as Array<{ id?: string; type?: string }>).find(
      (field) => field.type === 'approval_grid'
    );
    if (gridField?.id && formData && typeof formData === 'object') {
      const grid = ((formData as Record<string, unknown>)[gridField.id] || {}) as Record<
        string,
        { userId?: string; colTitle?: string }
      >;
      const isSelfApprover = Object.entries(grid).some(
        ([colKey, col]) => colKey !== 'col_0' && col?.userId === ownerId && !isCheckerColumn(col)
      );
      if (isSelfApprover) {
        return NextResponse.json(
          {
            error:
              'ผู้สร้าง Memo ไม่สามารถเป็นผู้อนุมัติ (ATTN TO) ของ Memo ตนเองได้ — อนุญาตเฉพาะขั้นผู้ตรวจสอบ',
          },
          { status: 400 }
        );
      }
    }

    let approvalRoute: Array<{ level: number; approvalLevel: string; required: boolean }> = [];
    if (template.conditionId) {
      const condDoc = await getDoc(doc(db, 'memoConditions', template.conditionId));
      if (condDoc.exists()) {
        approvalRoute = condDoc.data()!.approvalRoute || [];
      }
    }

    const now = new Date();
    const firstLevel = approvalRoute.length > 0 ? approvalRoute[0] : null;

    const deadlineDays = await getDeadlineDays();

    const memoBase = {
      templateId,
      templateName: template.name,
      status: isDraft ? 'draft' : 'new',
      title,
      formData,
      ownerId,
      ownerName,
      department: department || '',
      approvalRoute,
      currentApprovalIndex: 0,
      currentApprovalLevel: firstLevel?.approvalLevel || null,
      approvals: [],
      deadlineAt: isDraft ? null : new Date(Date.now() + deadlineDays * 86400000),
      createdAt: now,
      updatedAt: now,
    };

    // Create-only transaction: never overwrite an existing memo id. On a rare
    // race the transaction aborts and a fresh (max + 1) id is generated.
    let memoId = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      memoId = await generateMemoId(department || 'XX');
      const memoData = { memoNumber: memoId, ...memoBase };

      try {
        await runTransaction(db, async (transaction) => {
          const memoRef = doc(db, 'memos', memoId);
          const existing = await transaction.get(memoRef);
          if (existing.exists()) {
            throw new Error('MEMO_ID_CONFLICT');
          }
          transaction.set(memoRef, memoData);
        });
        break;
      } catch (error) {
        if (
          !(error instanceof Error) ||
          error.message !== 'MEMO_ID_CONFLICT' ||
          attempt === 4
        ) {
          throw error;
        }
      }
    }

    if (!isDraft) {
      await logMemoCreated(ownerId, ownerName, title, now);
      await notifyApprovers(formData, memoId, title, ownerId, now);
    }

    return NextResponse.json({ memoId });
  } catch (error) {
    await logApiError('/api/memos POST', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
