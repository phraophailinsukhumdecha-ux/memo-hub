import { db } from '@/lib/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { getNextApprovalColumn } from '@/lib/approval-flow';

export async function logMemoCreated(userId: string, userName: string, title: string, timestamp: Date): Promise<void> {
  await addDoc(collection(db, 'eventLogs'), {
    userId,
    userName,
    action: 'MEMO_CREATED',
    details: `สร้าง Memo ใหม่: ${title}`,
    timestamp,
  });
}

export async function notifyApprovers(
  formData: Record<string, unknown>,
  memoId: string,
  title: string,
  ownerId: string,
  timestamp: Date
): Promise<void> {
  // Sequential flow: at creation only the first approver in the chain
  // (the "Checked by" reviewer) is notified. Later approvers are notified when
  // earlier steps are completed.
  const next = getNextApprovalColumn(formData);
  const userId = next?.userId;
  if (!userId || userId === ownerId) return;

  await addDoc(collection(db, 'notifications'), {
    userId,
    type: 'new_memo',
    memoId,
    message: `มี Memo ใหม่รอการอนุมัติ: ${title}`,
    isRead: false,
    createdAt: timestamp,
  });
}
