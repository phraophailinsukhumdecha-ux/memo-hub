import { NextRequest, NextResponse } from 'next/server';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getDb() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'intappprojects',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
      }),
    });
  }
  return getFirestore(getApps()[0], 'memohub-db');
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' }, { status: 400 });
    }

    const db = getDb();
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('username', '==', username).limit(1).get();

    if (snapshot.empty) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    const doc = snapshot.docs[0];
    const userData = doc.data();

    if (userData.password !== password) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    const { password: _, ...userWithoutPassword } = userData;
    void _;

    return NextResponse.json({
      user: {
        id: doc.id,
        ...userWithoutPassword,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในระบบ' }, { status: 500 });
  }
}
