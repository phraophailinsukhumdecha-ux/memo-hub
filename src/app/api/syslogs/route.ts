import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const docRef = await addDoc(collection(db, 'syslogs'), {
      ...body,
      timestamp: serverTimestamp(),
    });
    return NextResponse.json({ id: docRef.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
