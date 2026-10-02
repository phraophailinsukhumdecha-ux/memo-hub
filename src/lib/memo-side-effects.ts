import { db } from '@/lib/firebase';
import { addDoc, collection } from 'firebase/firestore';

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
              createdAt: timestamp,
            });
          }
        }
      }
    }
  }
}
