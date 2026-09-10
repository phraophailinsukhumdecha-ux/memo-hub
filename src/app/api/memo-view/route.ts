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

/**
 * Public full-memo view (no login). Token-based, expires in 7 days.
 * Returns only the fields needed to render the memo — never passwords.
 */
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
    const expiresAt =
      tokenData.expiresAt?.toDate?.() || new Date(tokenData.expiresAt);
    if (new Date() > expiresAt) {
      return NextResponse.json({ ok: false, error: 'ลิงค์หมดอายุ' }, { status: 400 });
    }

    const memoDoc = await getDoc(doc(db, 'memos', tokenData.memoId));
    if (!memoDoc.exists()) {
      return NextResponse.json({ ok: false, error: 'ไม่พบ Memo' }, { status: 404 });
    }
    const memo = { id: memoDoc.id, ...memoDoc.data() } as Record<string, unknown>;

    let template: Record<string, unknown> | null = null;
    if (memo.templateId) {
      const templateDoc = await getDoc(
        doc(db, 'memoTemplates', memo.templateId as string)
      );
      if (templateDoc.exists()) {
        template = { id: templateDoc.id, ...templateDoc.data() };
      }
    }

    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users = usersSnapshot.docs.map((d) => {
      const u = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        displayName: u.displayName,
        department: u.department,
        position: u.position,
      };
    });
    const owner =
      users.find((u) => u.id === (memo.ownerId as string)) || null;

    return NextResponse.json({ ok: true, memo, template, users, owner });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}
