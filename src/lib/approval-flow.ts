import type { Memo } from '@/types';

export interface ApprovalColumn {
  key: string;
  index: number;
  userId?: string;
  name?: string;
  signed: boolean;
  action?: string;
}

/**
 * Read the approval-grid columns (col_1, col_2, ...) from a memo's formData.
 * col_0 (the requester) is ignored because it never approves.
 */
export function extractApprovalColumns(formData: unknown): ApprovalColumn[] {
  const columns: ApprovalColumn[] = [];
  if (!formData || typeof formData !== 'object') return columns;

  for (const value of Object.values(formData as Record<string, unknown>)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      if (!key.startsWith('col_') || key === 'col_0') continue;
      const col = (raw || {}) as Record<string, unknown>;
      const userId = typeof col.userId === 'string' ? col.userId : undefined;
      const name = typeof col.name === 'string' ? col.name : undefined;
      if (!userId && !name) continue;
      columns.push({
        key,
        index: parseInt(key.split('_')[1] || '0', 10) || 0,
        userId,
        name,
        signed: Boolean(col.signed),
        action: typeof col.action === 'string' ? col.action : undefined,
      });
    }
  }

  return columns.sort((a, b) => a.index - b.index);
}

/**
 * The next column that may act: the earliest unsigned column whose predecessors
 * are all signed. Checkers ("Checked by") must finish before approvers ("ATTN TO").
 */
export function getNextApprovalColumn(formData: unknown): ApprovalColumn | null {
  const columns = extractApprovalColumns(formData);
  let next: ApprovalColumn | null = null;

  for (const col of columns) {
    if (col.signed) continue;
    const blockedByPrevious = columns.some((prev) => prev.index < col.index && !prev.signed);
    if (blockedByPrevious) break;
    next = col;
    break;
  }

  return next;
}

/** Columns still waiting to act, in chain order (used for notification targeting). */
export function getPendingApprovalColumns(formData: unknown): ApprovalColumn[] {
  const next = getNextApprovalColumn(formData);
  return next ? [next] : [];
}

export function isUserNextApprover(memo: Pick<Memo, 'formData'>, user: { id: string; displayName?: string } | null | undefined): boolean {
  if (!user) return false;
  const next = getNextApprovalColumn(memo.formData);
  if (!next) return false;
  return (next.userId && next.userId === user.id) || (!next.userId && !!next.name && next.name === user.displayName);
}

/** True when the user's own column in the approval grid has already been signed. */
export function hasUserActed(memo: Pick<Memo, 'formData'>, user: { id: string; displayName?: string } | null | undefined): boolean {
  if (!user) return false;
  return extractApprovalColumns(memo.formData).some(
    (col) =>
      ((col.userId && col.userId === user.id) || (!col.userId && !!col.name && col.name === user.displayName)) &&
      col.signed
  );
}

/** True when the user appears anywhere in the approval grid (for history views). */
export function isUserInApprovalGrid(memo: Pick<Memo, 'formData'>, user: { id: string; displayName?: string } | null | undefined): boolean {
  if (!user) return false;
  return extractApprovalColumns(memo.formData).some(
    (col) => (col.userId && col.userId === user.id) || (!col.userId && !!col.name && col.name === user.displayName)
  );
}

/** True when all approval columns (col_1+) are signed. */
export function isFullyApproved(formData: unknown): boolean {
  const columns = extractApprovalColumns(formData);
  return columns.length > 0 && columns.every((col) => col.signed);
}
