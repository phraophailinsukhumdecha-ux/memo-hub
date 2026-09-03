import { Memo } from '@/types';
import { subscribeToFirestoreCollection, orderBy, where, limit } from '@/lib/firestore-db';

export function subscribeToMemos(callback: (memos: Memo[]) => void) {
  return subscribeToFirestoreCollection<Memo>(
    'memos',
    (data) => callback([...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())),
    orderBy('createdAt', 'desc'),
    limit(100)
  );
}

export function subscribeToPendingMemos(callback: (memos: Memo[]) => void) {
  return subscribeToFirestoreCollection<Memo>(
    'memos',
    (data) => callback([...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())),
    where('status', 'in', ['new', 'waiting']),
    limit(50)
  );
}

export async function getMemoById(id: string): Promise<Memo | null> {
  const res = await fetch(`/api/memos/${id}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.memo;
}

export async function createMemo(
  templateId: string,
  title: string,
  formData: Record<string, unknown>,
  ownerId: string,
  ownerName: string,
  department?: string
): Promise<string> {
  const res = await fetch('/api/memos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateId, title, formData, ownerId, ownerName, department }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create memo');
  return data.memoId;
}

export async function approveMemo(memoId: string, approverId: string, approverName: string, comment?: string): Promise<void> {
  const res = await fetch(`/api/memos/${memoId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approverId, approverName, comment }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to approve memo');
  }
}

export async function rejectMemo(memoId: string, approverId: string, approverName: string, comment: string): Promise<void> {
  const res = await fetch(`/api/memos/${memoId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approverId, approverName, comment }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to reject memo');
  }
}

export async function cancelMemo(memoId: string): Promise<void> {
  const res = await fetch(`/api/memos/${memoId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to cancel memo');
  }
}

export async function updateMemoDeadline(): Promise<void> {
  await fetch('/api/memos/deadline', { method: 'POST' });
}
