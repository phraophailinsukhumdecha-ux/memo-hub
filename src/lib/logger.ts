import { logSys } from '@/lib/syslogs';

export async function logApiError(endpoint: string, error: unknown, userId?: string, userName?: string) {
  const message = error instanceof Error ? error.message : String(error);
  await logSys('error', 'api', `API Error: ${endpoint} - ${message}`, { endpoint }, userId, userName);
}

export async function logAuthEvent(action: string, username: string, success: boolean, metadata?: Record<string, unknown>) {
  const level: 'info' | 'warning' = success ? 'info' : 'warning';
  await logSys(level, 'auth', `Auth: ${action} - ${username} (${success ? 'สำเร็จ' : 'ล้มเหลว'})`, metadata);
}

export async function logFirebaseError(operation: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  await logSys('error', 'firebase', `Firebase Error: ${operation} - ${message}`, { operation });
}

export async function logSystemEvent(message: string, metadata?: Record<string, unknown>) {
  await logSys('info', 'system', message, metadata);
}
