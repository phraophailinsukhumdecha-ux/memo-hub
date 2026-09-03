import { Notification } from '@/types';
import { subscribeToFirestoreCollection, where } from '@/lib/firestore-db';

export function subscribeToNotifications(userId: string, callback: (notifications: Notification[]) => void) {
  return subscribeToFirestoreCollection<Notification>(
    'notifications',
    (data) => callback([...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())),
    where('userId', '==', userId)
  );
}

export async function createNotification(userId: string, type: Notification['type'], message: string, memoId?: string): Promise<void> {
  await fetch('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, type, message, memoId }),
  });
}

export async function markAsRead(notificationId: string): Promise<void> {
  await fetch(`/api/notifications/${notificationId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isRead: true }),
  });
}

export async function markAllAsRead(userId: string): Promise<void> {
  await fetch('/api/notifications/read-all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
}

export async function deleteNotification(notificationId: string): Promise<void> {
  await fetch(`/api/notifications/${notificationId}`, { method: 'DELETE' });
}

export async function getUnreadCount(userId: string): Promise<number> {
  const res = await fetch(`/api/notifications?userId=${userId}&unread=true`);
  const data = await res.json();
  return data.count || 0;
}
