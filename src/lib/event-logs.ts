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

export interface ApprovalLogInput {
  memoId: string;
  memoNumber?: string;
  memoTitle: string;
  decision: 'approve' | 'reject';
  channel: 'web' | 'email';
  comment?: string;
}

/**
 * Builds the audit entry for an approve/reject action so every channel (web or
 * email) records the same decision, channel and remark.
 */
export function buildApprovalLog(input: ApprovalLogInput): {
  action: 'MEMO_APPROVED' | 'MEMO_REJECTED';
  details: string;
  metadata: Record<string, unknown>;
} {
  const actionLabel = input.decision === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ';
  const channelLabel = input.channel === 'email' ? 'อีเมล' : 'ระบบ';
  const comment = (input.comment || '').trim();
  return {
    action: input.decision === 'approve' ? 'MEMO_APPROVED' : 'MEMO_REJECTED',
    details: `${actionLabel} Memo: ${input.memoTitle} (ผ่าน${channelLabel})${comment ? ` — หมายเหตุ: ${comment}` : ''}`,
    metadata: {
      memoId: input.memoId,
      memoNumber: input.memoNumber || '',
      decision: input.decision,
      channel: input.channel,
      comment,
    },
  };
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
