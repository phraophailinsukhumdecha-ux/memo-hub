import { EventLog } from '@/types';
import { subscribeToFirestoreCollection, orderBy, limit } from '@/lib/firestore-db';

export function subscribeToEventLogs(callback: (logs: EventLog[]) => void, maxLimit = 100) {
  return subscribeToFirestoreCollection<EventLog>(
    'eventLogs',
    (data) => callback(data),
    orderBy('timestamp', 'desc'),
    limit(maxLimit)
  );
}

export async function logEvent(userId: string, userName: string, action: string, details: string, metadata?: Record<string, unknown>): Promise<void> {
  await fetch('/api/event-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, userName, action, details, metadata }),
  });
}

export async function logMemoCreated(userId: string, userName: string, memoTitle: string) {
  return logEvent(userId, userName, 'MEMO_CREATED', `สร้าง Memo ใหม่: ${memoTitle}`);
}

export async function logMemoApproved(userId: string, userName: string, memoTitle: string) {
  return logEvent(userId, userName, 'MEMO_APPROVED', `อนุมัติ Memo: ${memoTitle}`);
}

export async function logMemoRejected(userId: string, userName: string, memoTitle: string) {
  return logEvent(userId, userName, 'MEMO_REJECTED', `ปฏิเสธ Memo: ${memoTitle}`);
}

export async function logMemoCancelled(userId: string, userName: string, memoTitle: string) {
  return logEvent(userId, userName, 'MEMO_CANCELLED', `ยกเลิก Memo: ${memoTitle}`);
}

export async function logMemoUpdated(userId: string, userName: string, memoTitle: string) {
  return logEvent(userId, userName, 'MEMO_UPDATED', `อัพเดท Memo: ${memoTitle}`);
}

export async function logSettingUpdated(userId: string, userName: string, settingName: string, oldValue: unknown, newValue: unknown) {
  return logEvent(userId, userName, 'SETTING_UPDATED', `อัพเดทการตั้งค่า: ${settingName}`, { oldValue, newValue });
}
