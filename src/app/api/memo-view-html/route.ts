import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { buildMemoHtml } from '@/lib/memo-pdf';
import type { Memo, MemoTemplate, User } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    if (!token) {
      return NextResponse.json({ ok: false, error: 'ไม่พบ Token' }, { status: 400 });
    }

    const tokenQuery = query(
      collection(db, 'memoViewTokens'),
      where('token', '==', token)
    );
    const tokenSnapshot = await getDocs(tokenQuery);
    if (tokenSnapshot.empty) {
      return NextResponse.json({ ok: false, error: 'ลิงค์ไม่ถูกต้อง' }, { status: 404 });
    }
    const tokenData = tokenSnapshot.docs[0].data();

    const memoDoc = await getDoc(doc(db, 'memos', tokenData.memoId));
    if (!memoDoc.exists()) {
      return NextResponse.json({ ok: false, error: 'ไม่พบ Memo' }, { status: 404 });
    }
    const memo = { id: memoDoc.id, ...memoDoc.data() } as Memo;

    let template: MemoTemplate | null = null;
    if (memo.templateId) {
      const templateDoc = await getDoc(doc(db, 'memoTemplates', memo.templateId));
      if (templateDoc.exists()) {
        template = { id: templateDoc.id, ...templateDoc.data() } as MemoTemplate;
      }
    }

    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users = usersSnapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Record<string, unknown>),
    })) as User[];
    const owner = users.find((u) => u.id === memo.ownerId) || null;

    const rawHtml = buildMemoHtml(memo, template, undefined, owner, users);
    const html = `<div style="max-width:210mm;width:100%;margin:0 auto;">${rawHtml}</div>`;

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}
