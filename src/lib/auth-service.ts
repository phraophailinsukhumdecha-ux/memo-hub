import { User } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

export async function login(username: string, password: string): Promise<User | null> {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('username', '==', username), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  const userData = doc.data();

  if (userData.password !== password) return null;

  const { password: _, ...userWithoutPassword } = userData;
  void _;

  return {
    id: doc.id,
    ...userWithoutPassword,
  } as User;
}

export async function register(data: {
  username: string;
  password: string;
  email: string;
  displayName: string;
  role: User['role'];
  department?: string;
}): Promise<User | null> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) return null;
  const result = await res.json();
  return result.user;
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem('mhub_user');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      localStorage.removeItem('mhub_user');
    }
  }
  return null;
}

export function storeUser(user: User): void {
  localStorage.setItem('mhub_user', JSON.stringify(user));
}

export function clearStoredUser(): void {
  localStorage.removeItem('mhub_user');
}
