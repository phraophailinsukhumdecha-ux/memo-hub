import type { Memo } from '@/types';

export interface ApprovalColumn {
  key: string;
  index: number;
  userId?: string;
  name?: string;
  signed: boolean;
  action?: string;
  colTitle?: string;
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
        colTitle: typeof col.colTitle === 'string' ? col.colTitle : undefined,
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

/**
 * The column that acted immediately before `currentColKey` in the chain.
 * Returns null for the first step (nothing acts before it).
 */
export function getPreviousApprovalColumn(
  formData: unknown,
  currentColKey?: string | null
): ApprovalColumn | null {
  if (!currentColKey) return null;
  const columns = extractApprovalColumns(formData);
  const index = columns.findIndex((col) => col.key === currentColKey);
  if (index <= 0) return null;
  for (let i = index - 1; i >= 0; i--) {
    if (columns[i].signed) return columns[i];
  }
  return null;
}

/**
 * The unsigned column belonging to a specific user. A person may appear more
 * than once in the chain (e.g. checker and approver), so columns they already
 * signed must be skipped.
 */
export function findActionColumn(
  formData: unknown,
  userId?: string,
  userName?: string
): ApprovalColumn | null {
  return (
    extractApprovalColumns(formData)
      .filter((col) => !col.signed)
      .find((col) => (!!userId && col.userId === userId) || (!!userName && col.name === userName)) ||
    null
  );
}

/**
 * Checkers ("Checked by") are identified by their column title, the same
 * convention used when classifying approval recipients.
 */
export function isCheckerColumn(
  column: Pick<ApprovalColumn, 'colTitle'> | null | undefined
): boolean {
  if (!column) return false;
  return /ตรวจ|checked/i.test(column.colTitle || '');
}

/**
 * The memo owner may act as a checker on their own memo, but must never
 * approve/reject it in an approver ("ATTN TO") column.
 */
export function isOwnerSelfApprovalBlocked(
  memo: { ownerId?: unknown; formData?: unknown },
  userId: string | undefined,
  colKey: string | null | undefined
): boolean {
  if (!userId || !colKey || memo.ownerId !== userId) return false;
  const column = extractApprovalColumns(memo.formData).find((col) => col.key === colKey);
  return !!column && !isCheckerColumn(column);
}

/**
 * Whether the user may act on the memo's current step.
 * Owners are limited to checker steps; everyone else follows the chain.
 */
export function canUserActOnMemo(
  memo: { ownerId?: unknown; formData?: unknown },
  user: { id: string; displayName?: string } | null | undefined
): boolean {
  if (!user) return false;
  const next = getNextApprovalColumn(memo.formData);
  if (!next) return false;
  const isNext =
    (next.userId && next.userId === user.id) ||
    (!next.userId && !!next.name && next.name === user.displayName);
  if (!isNext) return false;
  if (memo.ownerId !== user.id) return true;
  return isCheckerColumn(next);
}

export interface GridColumnValue {
  name?: string;
  userId?: string;
  signed?: boolean;
  action?: string;
  date?: string;
  time?: string;
  signerTitle?: string;
  colTitle?: string;
}

interface DisplayPerson {
  id?: string;
  displayName?: string;
  name?: string;
}

/**
 * Build the approval grid in display order (owner, then checkers, then
 * approvers, with pinned people last) while keeping each column's own
 * signature data (action/date/time) attached to it.
 *
 * Without this, re-ordering only the names made the "อนุมัติ" stamp and date
 * stay on the old column, so they appeared under the wrong person.
 */
export function buildDisplayGrid(
  grid: Record<string, GridColumnValue> | undefined,
  checkers: DisplayPerson[],
  approvers: DisplayPerson[],
  options?: { includeOwnerSlot?: boolean }
): Array<{ key: string; data: GridColumnValue }> {
  const data = grid || {};
  const keys = Object.keys(data)
    .filter((key) => key.startsWith('col_'))
    .sort((a, b) => parseInt(a.split('_')[1] || '0', 10) - parseInt(b.split('_')[1] || '0', 10));

  const columns: Array<{ key: string; data: GridColumnValue }> = [];
  const ownerKey = keys.find((key) => key === 'col_0');
  if (ownerKey) {
    columns.push({ key: ownerKey, data: data[ownerKey] || {} });
  } else if (options?.includeOwnerSlot) {
    columns.push({ key: 'col_0', data: {} });
  }

  const available = keys.filter((key) => key !== 'col_0');
  const used = new Set<string>();

  const takeKeyFor = (person: DisplayPerson): string | null => {
    for (const key of available) {
      if (used.has(key)) continue;
      const col = data[key] || {};
      const name = person.displayName || person.name;
      if ((!!person.id && col.userId === person.id) || (!col.userId && !!name && col.name === name)) {
        used.add(key);
        return key;
      }
    }
    return null;
  };

  for (const person of [...checkers, ...approvers]) {
    const key = takeKeyFor(person);
    if (key) {
      columns.push({ key, data: data[key] || {} });
    } else {
      // No stored column for this assignee (legacy/preview): keep a slot so the
      // column count stays the same.
      columns.push({
        key: `display_${columns.length}`,
        data: { name: person.displayName || person.name || '' },
      });
    }
  }

  // Keep any leftover columns (assignee lists changed) instead of dropping them.
  for (const key of available) {
    if (!used.has(key)) {
      used.add(key);
      columns.push({ key, data: data[key] || {} });
    }
  }

  return columns;
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

export interface ApprovalRecipient {
  userId?: string;
  name: string;
  email: string;
  role: 'checker' | 'approver';
  colKey: string;
  colTitle?: string;
  signed: boolean;
}

/**
 * Resolve the checkers/approvers of a memo to e-mail recipients.
 * The resend dialog and the resend API both use this list.
 */
export function getApprovalRecipients(
  formData: unknown,
  users: Array<{ id: string; displayName?: string; email?: string }>
): ApprovalRecipient[] {
  const seen = new Set<string>();
  const recipients: ApprovalRecipient[] = [];

  for (const col of extractApprovalColumns(formData)) {
    const user = users.find(
      (candidate) =>
        (col.userId && candidate.id === col.userId) ||
        (!col.userId && !!col.name && candidate.displayName === col.name)
    );
    const email = (user?.email || '').trim();
    if (!email || seen.has(email)) continue;
    seen.add(email);

    const title = (col.colTitle || '').toLowerCase();
    const role: 'checker' | 'approver' = /ตรวจ|checked/.test(title) ? 'checker' : 'approver';
    recipients.push({
      userId: col.userId,
      name: user?.displayName || col.name || '',
      email,
      role,
      colKey: col.key,
      colTitle: col.colTitle,
      signed: col.signed,
    });
  }

  return recipients;
}
