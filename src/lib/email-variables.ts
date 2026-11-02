import { APP_TIME_ZONE, formatActionTime, formatThaiDate } from '@/lib/datetime';
import { getMemoSubject, type SubjectTemplateField } from '@/lib/memo-subject';

/**
 * Single source of truth for email template variables.
 *
 * Every email type (approver / owner / other approvers / CC) receives the same
 * variable set, so a template can use any variable regardless of which card it
 * was edited in. Adding a new variable here makes it available everywhere and
 * automatically shows up in the settings UI.
 */
export interface EmailVariableDefinition {
  key: string;
  label: string;
}

export const EMAIL_VARIABLES: EmailVariableDefinition[] = [
  { key: 'memo_number', label: 'เลขที่ Memo' },
  { key: 'subject', label: 'ชื่อเรื่อง (จากฟอร์ม)' },
  { key: 'title', label: 'ชื่อเรื่อง (เหมือน subject)' },
  { key: 'owner_name', label: 'ชื่อผู้สร้าง Memo' },
  { key: 'department', label: 'แผนกผู้สร้าง' },
  { key: 'status', label: 'สถานะ Memo' },
  { key: 'deadline', label: 'Deadline (วันที่)' },
  { key: 'sendDate', label: 'วันที่ส่งอีเมล' },
  { key: 'time', label: 'เวลาที่ส่งอีเมล' },
  { key: 'memo_url', label: 'ลิงก์หน้า Home' },
  { key: 'memo_link', label: 'ลิงก์ดูเอกสาร (view-only)' },
  { key: 'approver_name', label: 'ชื่อผู้อนุมัติ / ผู้รับ' },
  { key: 'cc_name', label: 'ชื่อผู้รับ CC' },
  { key: 'recipient_name', label: 'ชื่อผู้รับอีเมล' },
  { key: 'actor_name', label: 'ชื่อผู้ดำเนินการ' },
  { key: 'action_label', label: 'การดำเนินการ (อนุมัติ/ถูกปฏิเสธ)' },
  { key: 'remark', label: 'หมายเหตุ / เหตุผล' },
  { key: 'acted_at', label: 'เวลาที่ดำเนินการ' },
];

export interface EmailVariableContext {
  memo: Record<string, unknown>;
  templateFields?: SubjectTemplateField[];
  baseUrl?: string;
  memoId?: string;
  /** Person receiving this specific email. */
  recipientName?: string;
  approverName?: string;
  ccName?: string;
  /** Person who performed the action (owner/approver notifications). */
  actorName?: string;
  actionLabel?: string;
  remark?: string;
  actedAt?: string;
  memoLink?: string;
}

export const DEFAULT_APPROVER_SUBJECT = '[MemoHub] {memo_number} - {subject}';
export const DEFAULT_APPROVER_BODY = `สวัสดีค่ะ/ครับ คุณ{approver_name}

มี Memo ใหม่รอการอนุมัติของท่าน

เลขที่: {memo_number}
เรื่อง: {subject}
ผู้สร้าง: {owner_name}
Deadline: {deadline}`;

export const DEFAULT_CC_SUBJECT = '[MemoHub] {memo_number} - {subject}';
export const DEFAULT_CC_BODY = `สวัสดีค่ะ/ครับ

มี Memo แจ้งเพื่อทราบ (CC)

เลขที่: {memo_number}
เรื่อง: {subject}
ผู้สร้าง: {owner_name}
Deadline: {deadline}`;

export const DEFAULT_OWNER_SUBJECT =
  '[MemoHub] {memo_number} - {subject} ({action_label}โดย {actor_name})';
export const DEFAULT_OWNER_BODY = `สวัสดีค่ะ/ครับ

Memo ของท่านมีการดำเนินการ: {action_label}โดย {actor_name}
เลขที่: {memo_number}
เรื่อง: {subject}`;

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function statusLabel(status: unknown): string {
  if (status === 'approved') return 'อนุมัติแล้ว';
  if (status === 'rejected') return 'ถูกปฏิเสธ';
  return 'รออนุมัติ';
}

/** Build the complete variable set (missing values become an empty string). */
export function buildEmailVariables(context: EmailVariableContext): Record<string, string> {
  const memo = context.memo || {};
  const formData = (memo.formData || {}) as Record<string, unknown>;
  const memoSubject = getMemoSubject(formData, context.templateFields, readString(memo.title));
  const deadline = toDate(memo.deadlineAt);
  const now = new Date();
  const recipientName = context.recipientName || context.approverName || context.ccName || '';

  return {
    memo_number: readString(memo.memoNumber) || context.memoId || '',
    subject: memoSubject,
    title: memoSubject,
    owner_name: readString(memo.ownerName),
    department: readString(memo.department),
    status: statusLabel(memo.status),
    deadline: deadline ? formatThaiDate(deadline) : '',
    sendDate: now.toLocaleDateString('th-TH', { timeZone: APP_TIME_ZONE }),
    time: formatActionTime(now),
    memo_url: context.baseUrl ? `${context.baseUrl}/home` : '',
    memo_link: context.memoLink || '',
    approver_name: context.approverName || recipientName,
    cc_name: context.ccName || '',
    recipient_name: recipientName,
    actor_name: context.actorName || '',
    action_label: context.actionLabel || '',
    remark: context.remark || '',
    acted_at: context.actedAt || '',
  };
}

/** Replace `{variable}` placeholders in a template. */
export function replaceEmailVariables(
  template: string,
  vars: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}
