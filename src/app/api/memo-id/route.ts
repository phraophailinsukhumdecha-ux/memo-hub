import { NextResponse } from 'next/server';
import { generateMemoId } from '@/lib/memo-id';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department') || '';
    const memoId = await generateMemoId(department);
    return NextResponse.json({ memoId });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate memo ID' }, { status: 500 });
  }
}
