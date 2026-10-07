import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function getDeadlineDays(): Promise<number> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'global'));
    const days = snap.exists() ? Number(snap.data()!.deadlineDays) : NaN;
    return Number.isFinite(days) && days >= 1 ? days : 7;
  } catch {
    return 7;
  }
}
