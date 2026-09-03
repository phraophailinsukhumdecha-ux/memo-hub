import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, addDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const now = new Date();

    if (body.duplicateFromId) {
      const sourceDoc = await getDoc(doc(db, 'memoTemplates', body.duplicateFromId));
      if (!sourceDoc.exists()) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      const sourceData = sourceDoc.data()!;
      const { name, ...rest } = body;
      const newData = {
        ...sourceData,
        name: name || `${sourceData.name} (คัดลอก)`,
        createdAt: now,
        updatedAt: now,
      };
      const docRef = await addDoc(collection(db, 'memoTemplates'), newData);
      return NextResponse.json({ template: { id: docRef.id, ...newData } });
    }

    const { duplicateFromId, ...templateData } = body;
    const docRef = await addDoc(collection(db, 'memoTemplates'), { ...templateData, createdAt: now, updatedAt: now });
    return NextResponse.json({ template: { id: docRef.id, ...templateData, createdAt: now, updatedAt: now } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
