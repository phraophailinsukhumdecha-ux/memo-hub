import { MemoCondition } from '@/types';
import { subscribeToFirestoreCollection, orderBy } from '@/lib/firestore-db';

export function subscribeToConditions(callback: (conditions: MemoCondition[]) => void) {
  return subscribeToFirestoreCollection<MemoCondition>(
    'memoConditions',
    (data) => callback([...data].sort((a, b) => a.name.localeCompare(b.name, 'th'))),
    orderBy('name')
  );
}

export async function createCondition(data: Omit<MemoCondition, 'id' | 'createdAt' | 'updatedAt'>): Promise<MemoCondition> {
  const res = await fetch('/api/conditions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  return result.condition;
}

export async function updateCondition(conditionId: string, data: Partial<MemoCondition>): Promise<void> {
  await fetch(`/api/conditions/${conditionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteCondition(conditionId: string): Promise<void> {
  await fetch(`/api/conditions/${conditionId}`, { method: 'DELETE' });
}
