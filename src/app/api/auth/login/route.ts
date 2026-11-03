import { NextRequest, NextResponse } from 'next/server';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logAuthEvent, logApiError } from '@/lib/logger';

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
      await logAuthEvent('login', username, false, { reason: 'user-not-found', source: 'api' });
      return NextResponse.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    const doc = snapshot.docs[0];
    const userData = doc.data();

    if (userData.password !== password) {
      await logAuthEvent('login', username, false, { reason: 'wrong-password', source: 'api' });
      return NextResponse.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    const now = new Date();
    // Presence: record the sign-in so admins can see who is online.
    try {
      await doc.ref.update({
        lastLoginAt: FieldValue.serverTimestamp(),
        lastSeenAt: FieldValue.serverTimestamp(),
      });
    } catch {
      /* presence is best-effort */
    }

    const { password: _, ...userWithoutPassword } = userData;
    void _;

    await logAuthEvent('login', username, true, { userId: doc.id, source: 'api' });

    return NextResponse.json({
      user: {
        id: doc.id,
        ...userWithoutPassword,
        lastLoginAt: now,
        lastSeenAt: now,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    await logApiError('/api/auth/login', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในระบบ' }, { status: 500 });
  }
}
