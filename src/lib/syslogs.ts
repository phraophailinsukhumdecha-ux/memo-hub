import { Syslog } from '@/types';
import {
  subscribeToFirestoreCollection,
  orderBy,
  limit as firestoreLimit,
  where,
} from '@/lib/firestore-db';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface SyslogFilters {
  level?: string;
  category?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

export function subscribeToSyslogs(
  callback: (logs: Syslog[]) => void,
  filters?: SyslogFilters,
  maxLimit = 100
) {
  const constraints: ReturnType<typeof where | typeof orderBy | typeof firestoreLimit>[] = [];

  if (filters?.level && filters.level !== 'all') {
    constraints.push(where('level', '==', filters.level));
  }
  if (filters?.category && filters.category !== 'all') {
    constraints.push(where('category', '==', filters.category));
  }
  if (filters?.startDate) {
    constraints.push(where('timestamp', '>=', filters.startDate));
  }
  if (filters?.endDate) {
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);
    constraints.push(where('timestamp', '<=', end));
  }

  constraints.push(orderBy('timestamp', 'desc'));
  constraints.push(firestoreLimit(maxLimit));

  return subscribeToFirestoreCollection<Syslog>(
    'syslogs',
    (data) => {
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        callback(data.filter((log) => log.message.toLowerCase().includes(searchLower)));
      } else {
        callback(data);
      }
    },
    ...constraints
  );
}

export async function logSys(
  level: Syslog['level'],
  category: Syslog['category'],
  message: string,
  metadata?: Record<string, unknown>,
  userId?: string,
  userName?: string
): Promise<void> {
  const docData: Record<string, unknown> = {
    level,
    category,
    message,
    timestamp: serverTimestamp(),
  };
  if (metadata) docData.metadata = metadata;
  if (userId) docData.userId = userId;
  if (userName) docData.userName = userName;

  await addDoc(collection(db, 'syslogs'), docData);
}

export async function logSysAuth(message: string, userId?: string, userName?: string, metadata?: Record<string, unknown>) {
  return logSys('info', 'auth', message, metadata, userId, userName);
}

export async function logSysApi(message: string, metadata?: Record<string, unknown>) {
  return logSys('info', 'api', message, metadata);
}

export async function logSysFirebase(message: string, metadata?: Record<string, unknown>) {
  return logSys('warning', 'firebase', message, metadata);
}

export async function logSysSystem(message: string, metadata?: Record<string, unknown>) {
  return logSys('info', 'system', message, metadata);
}

export async function logSysError(category: Syslog['category'], message: string, metadata?: Record<string, unknown>) {
  return logSys('error', category, message, metadata);
}
