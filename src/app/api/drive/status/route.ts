import { NextResponse } from 'next/server';
import { getDriveStatus } from '@/lib/google-drive';

export const runtime = 'nodejs';

export async function GET() {
  const status = await getDriveStatus();
  return NextResponse.json(status, { status: status.ok ? 200 : 500 });
}
