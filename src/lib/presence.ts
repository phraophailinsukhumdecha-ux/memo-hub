import type { User } from '@/types';

/** A user counts as online when their last heartbeat is younger than this. */
export const ONLINE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes
/** How often the client refreshes `lastSeenAt` while the app is open. */
export const HEARTBEAT_INTERVAL_MS = 60 * 1000; // 1 minute

function toMillis(value: User['lastSeenAt']): number | null {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  const parsed = new Date(value as unknown as string).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

export function isUserOnline(
  user: Pick<User, 'lastSeenAt'>,
  now: number = Date.now()
): boolean {
  const seen = toMillis(user.lastSeenAt);
  if (seen === null) return false;
  return now - seen < ONLINE_THRESHOLD_MS;
}
