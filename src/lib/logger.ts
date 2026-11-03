import { logSys } from '@/lib/syslogs';

/** Logging must never break the caller's flow. */
async function safeLog(
  level: 'info' | 'warning' | 'error',
  category: 'auth' | 'api' | 'firebase' | 'system',
  message: string,
  metadata?: Record<string, unknown>,
  userId?: string,
  userName?: string
): Promise<void> {
  try {
    await logSys(level, category, message, metadata, userId, userName);
  } catch {
    /* ignore logging failures */
  }
}

export async function logApiError(endpoint: string, error: unknown, userId?: string, userName?: string) {
  const message = error instanceof Error ? error.message : String(error);
  await safeLog('error', 'api', `API Error: ${endpoint} - ${message}`, { endpoint }, userId, userName);
}

export async function logAuthEvent(action: string, username: string, success: boolean, metadata?: Record<string, unknown>) {
  const level: 'info' | 'warning' = success ? 'info' : 'warning';
  await safeLog(level, 'auth', `Auth: ${action} - ${username || '-'} (${success ? 'สำเร็จ' : 'ล้มเหลว'})`, metadata);
}

export async function logFirebaseError(operation: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  await safeLog('error', 'firebase', `Firebase Error: ${operation} - ${message}`, { operation });
}

export async function logSystemEvent(message: string, metadata?: Record<string, unknown>) {
  await safeLog('info', 'system', message, metadata);
}
