import { User } from '@/types';
import { subscribeToFirestoreCollection, orderBy } from '@/lib/firestore-db';

export function subscribeToUsers(callback: (users: User[]) => void) {
  return subscribeToFirestoreCollection<User>(
    'users',
    (data) => callback([...data].sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '', 'th'))),
    orderBy('displayName')
  );
}

export async function createUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  return result.user;
}

export async function updateUser(userId: string, data: Partial<User>): Promise<void> {
  await fetch(`/api/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteUser(userId: string): Promise<void> {
  await fetch(`/api/users/${userId}`, { method: 'DELETE' });
}
