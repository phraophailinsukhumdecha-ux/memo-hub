import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const now = new Date();
    const docRef = await addDoc(collection(db, 'notifications'), { ...body, isRead: false, createdAt: now });
    return NextResponse.json({ id: docRef.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const unread = searchParams.get('unread');

    if (userId && unread === 'true') {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('isRead', '==', false)
      );
      const snap = await getDocs(q);
      return NextResponse.json({ count: snap.size });
    }

    return NextResponse.json({ count: 0 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
