import { NextResponse } from 'next/server';
import { getDriveStatus } from '@/lib/google-drive';
import { logApiError } from '@/lib/logger';

export const runtime = 'nodejs';

export async function GET() {
  const status = await getDriveStatus();
  if (!status.ok) {
    await logApiError('/api/drive/status', new Error(status.error || 'เชื่อมต่อ Google Drive ไม่สำเร็จ'));
  }
  return NextResponse.json(status, { status: status.ok ? 200 : 500 });
}
