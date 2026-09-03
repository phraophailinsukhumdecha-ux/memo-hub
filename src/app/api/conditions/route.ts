import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const now = new Date();
    const docRef = await addDoc(collection(db, 'memoConditions'), { ...body, createdAt: now, updatedAt: now });
    return NextResponse.json({ condition: { id: docRef.id, ...body, createdAt: now, updatedAt: now } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
