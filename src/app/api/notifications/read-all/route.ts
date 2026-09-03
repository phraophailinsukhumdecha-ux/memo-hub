import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('isRead', '==', false)
    );

    const snap = await getDocs(q);

    const batch = writeBatch(db);
    for (const d of snap.docs) {
      batch.update(doc(db, 'notifications', d.id), { isRead: true });
    }
    await batch.commit();

    return NextResponse.json({ success: true, updated: snap.size });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
