/**
 * Approval-grid ordering rules.
 *
 * Memos are created with checkers ("Checked by") first, then approvers
 * ("ATTN TO"). Two people are pinned to the end of their group (when present):
 *   - ดวงใจ ยาวะพันธุ์   -> last checker
 *   - จิรพล ยาวะพันธุ์   -> last approver (only when there is more than one)
 *
 * Matching uses the user id first (stable) and falls back to a whitespace-
 * normalized display name, so extra spaces/spelling differences still match.
 */
export const PINNED_LAST_CHECKER_ID = 'z6eltjJIG5X4W5yd1GlE';
export const PINNED_LAST_CHECKER_NAME = 'ดวงใจ ยาวะพันธุ์';
export const PINNED_LAST_APPROVER_ID = 'KftKCrAZZGbaEdnOgweA';
export const PINNED_LAST_APPROVER_NAME = 'จิรพล ยาวะพันธุ์';

interface NamedPerson {
  id?: string;
  displayName?: string;
  name?: string;
}

function normalizeName(value: string | undefined): string {
  return (value || '').trim().replace(/\s+/g, ' ');
}

function isPinnedPerson(person: NamedPerson, id: string, name: string): boolean {
  if (person.id && person.id === id) return true;
  return normalizeName(person.displayName || person.name) === normalizeName(name);
}

/** Move the named/id'ed person to the end of the list (when present). */
export function movePinnedLast<T extends NamedPerson>(
  list: T[],
  id: string,
  name: string,
  minLength = 1
): T[] {
  if (list.length < minLength) return list;
  const index = list.findIndex((person) => isPinnedPerson(person, id, name));
  if (index === -1 || index === list.length - 1) return list;
  const next = [...list];
  const [pinned] = next.splice(index, 1);
  next.push(pinned);
  return next;
}

export function orderApprovalAssignees<T extends NamedPerson>(
  checkers: T[],
  approvers: T[]
): { checkers: T[]; approvers: T[] } {
  return {
    checkers: movePinnedLast(checkers, PINNED_LAST_CHECKER_ID, PINNED_LAST_CHECKER_NAME, 1),
    approvers: movePinnedLast(approvers, PINNED_LAST_APPROVER_ID, PINNED_LAST_APPROVER_NAME, 2),
  };
}
