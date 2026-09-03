import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET() {
  try {
    const docRef = doc(db, 'settings', 'global');
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      return NextResponse.json({
        settings: {
          smtp: { host: '', port: 587, secure: false, user: '', password: '', fromEmail: '', fromName: 'MemoHub' },
          deadlineDays: 7,
          positionOptions: ['CEO', 'หัวหน้าแผนก', 'ซัพพลายเออร์', 'ลูกค้า', 'ร้านค้า'],
          departmentOptions: ['ไอที', 'บัญชี', 'เซล'],
          updatedAt: new Date(),
          updatedBy: 'system',
        },
      });
    }

    return NextResponse.json({ settings: { id: snapshot.id, ...snapshot.data() } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { settings, updatedBy } = await request.json();
    const now = new Date();

    await setDoc(doc(db, 'settings', 'global'), {
      ...settings,
      updatedAt: now,
      updatedBy,
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
