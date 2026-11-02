import { NextRequest, NextResponse } from 'next/server';
import type { DriveFolderMapping } from '@/types';
import { createFolder, getRootFolderId, listFolders } from '@/lib/google-drive';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const rootId = getRootFolderId();
    const folders = await listFolders(rootId);
    return NextResponse.json({
      rootFolderId: rootId,
      folders: folders.map((f) => ({ driveFolderId: f.id, name: f.name })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'อ่านโฟลเดอร์ไม่สำเร็จ' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { department?: string; name?: string };
    const department = (body.department || '').trim();
    const rawName = (body.name || department).trim();

    if (!department) {
      return NextResponse.json({ error: 'กรุณาเลือกแผนก' }, { status: 400 });
    }
    if (!rawName) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อโฟลเดอร์' }, { status: 400 });
    }

    const rootId = getRootFolderId();
    const existing = await listFolders(rootId);
    const already = existing.find((f) => f.name === rawName);
    const folder = already || (await createFolder(rawName, rootId));

    const mapping: DriveFolderMapping = {
      id: `df_${folder.id}`,
      department,
      name: folder.name,
      driveFolderId: folder.id,
      createdAt: new Date(),
    };

    return NextResponse.json({ folder: mapping, reused: Boolean(already) });
  } catch (error) {
    console.error('Create drive folder failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'สร้างโฟลเดอร์ไม่สำเร็จ' },
      { status: 500 }
    );
  }
}
