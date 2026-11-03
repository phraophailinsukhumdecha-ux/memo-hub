import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, serverTimestamp, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logApiError } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const docRef = await addDoc(collection(db, 'syslogs'), {
      ...body,
      timestamp: serverTimestamp(),
    });
    return NextResponse.json({ id: docRef.id });
  } catch (error) {
    await logApiError('/api/syslogs POST', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}

/** Delete old syslog entries (default: older than 30 days). */
export async function DELETE(request: NextRequest) {
  try {
    const days = Math.max(1, Number(new URL(request.url).searchParams.get('olderThanDays') || 30));
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const snapshot = await getDocs(query(collection(db, 'syslogs'), where('timestamp', '<', cutoff)));

    let deleted = 0;
    for (const docSnap of snapshot.docs) {
      await deleteDoc(docSnap.ref);
      deleted++;
    }

    return NextResponse.json({
      deleted,
      olderThanDays: days,
      cutoff: cutoff.toISOString(),
    });
  } catch (error) {
    await logApiError('/api/syslogs DELETE', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
