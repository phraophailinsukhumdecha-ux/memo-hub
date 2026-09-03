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
    const body = await request.json();
    const { username, password, email, displayName, role, department } = body;

    if (!username || !password || !email || !displayName) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }

    const db = getDb();
    const usersRef = db.collection('users');

    const existing = await usersRef.where('username', '==', username).limit(1).get();
    if (!existing.empty) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' }, { status: 409 });
    }

    const now = new Date();
    const newUser = {
      username,
      password,
      email,
      displayName,
      role: role || 'user',
      department: department || '',
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await usersRef.add(newUser);

    const { password: _, ...userWithoutPassword } = newUser;
    void _;

    return NextResponse.json({
      user: {
        id: docRef.id,
        ...userWithoutPassword,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในระบบ' }, { status: 500 });
  }
}
