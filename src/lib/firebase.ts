import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAySCPzCj1qaLGolMn5ggG6oCsOppF9sxA',
  authDomain: 'intappprojects.firebaseapp.com',
  projectId: 'intappprojects',
  storageBucket: 'intappprojects.firebasestorage.app',
  messagingSenderId: '378414291222',
  appId: '1:378414291222:web:8d536d481122aae3e49837',
  measurementId: 'G-X6ZT676B7V',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app, 'memohub-db');
