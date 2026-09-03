import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App;
let db: Firestore;

function getAdminApp(): App {
  if (getApps().length === 0) {
    app = initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'intappprojects',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
      }),
    });
  } else {
    app = getApps()[0];
  }
  return app;
}

export function getAdminDb(): Firestore {
  if (!db) {
    getAdminApp();
    db = getFirestore(getAdminApp(), 'memohub-db');
  }
  return db;
}
