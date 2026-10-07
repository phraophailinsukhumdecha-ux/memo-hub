import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { generateMemoId } from '@/lib/memo-id';
import { getDeadlineDays } from '@/lib/deadline';
import { logMemoCreated, notifyApprovers } from '@/lib/memo-side-effects';

export async function POST(request: NextRequest) {
  try {
    const { templateId, title, formData, ownerId, ownerName, department, status } = await request.json();
    const isDraft = status === 'draft';

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

    const deadlineDays = await getDeadlineDays();

    const memoData = {
      memoNumber: memoId,
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

    await setDoc(doc(db, 'memos', memoId), memoData);

    if (!isDraft) {
      await logMemoCreated(ownerId, ownerName, title, now);
      await notifyApprovers(formData, memoId, title, ownerId, now);
    }

    return NextResponse.json({ memoId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
