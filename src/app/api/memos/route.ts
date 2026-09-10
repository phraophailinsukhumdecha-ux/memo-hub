import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, setDoc, addDoc, query, where, getDocs } from 'firebase/firestore';
import { generateMemoId } from '@/lib/memo-id';

export async function POST(request: NextRequest) {
  try {
    const { templateId, title, formData, ownerId, ownerName, department } = await request.json();

    const templateDoc = await getDoc(doc(db, 'memoTemplates', templateId));
    if (!templateDoc.exists()) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    const template = templateDoc.data()!;

    let approvalRoute: Array<{ level: number; approvalLevel: string; required: boolean }> = [];
    if (template.conditionId) {
      const condDoc = await getDoc(doc(db, 'memoConditions', template.conditionId));
      if (condDoc.exists()) {
        approvalRoute = condDoc.data()!.approvalRoute || [];
      }
    }

    const memoId = await generateMemoId(department || 'XX');
    const now = new Date();
    const firstLevel = approvalRoute.length > 0 ? approvalRoute[0] : null;

    const memoData = {
      memoNumber: memoId,
      templateId,
      templateName: template.name,
      status: 'new',
      title,
      formData,
      ownerId,
      ownerName,
      department: department || '',
      approvalRoute,
      currentApprovalIndex: 0,
      currentApprovalLevel: firstLevel?.approvalLevel || null,
      approvals: [],
      deadlineAt: new Date(Date.now() + 7 * 86400000),
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, 'memos', memoId), memoData);

    await addDoc(collection(db, 'eventLogs'), {
      userId: ownerId,
      userName: ownerName,
      action: 'MEMO_CREATED',
      details: `สร้าง Memo ใหม่: ${title}`,
      timestamp: now,
    });

    // Create notifications for all approvers in the approval grid
    const notifiedUserIds = new Set<string>();

    for (const fieldKey of Object.keys(formData)) {
      const fieldValue = formData[fieldKey];
      if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
        for (const colKey of Object.keys(fieldValue)) {
          if (colKey.startsWith('col_') && colKey !== 'col_0' && (fieldValue as Record<string, Record<string, string>>)[colKey]?.userId) {
            const userId = (fieldValue as Record<string, Record<string, string>>)[colKey].userId;
            if (!notifiedUserIds.has(userId) && userId !== ownerId) {
              notifiedUserIds.add(userId);
              await addDoc(collection(db, 'notifications'), {
                userId,
                type: 'new_memo',
                memoId,
                message: `มี Memo ใหม่รอการอนุมัติ: ${title}`,
                isRead: false,
                createdAt: now,
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ memoId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
